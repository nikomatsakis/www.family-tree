const fs = require('fs');
const path = require('path');

// Source configuration belongs beside the genealogy data, never in shared code.
function prepareCitations(geneaPath) {
  const directory = path.dirname(path.resolve(geneaPath));
  const configPath = path.join(directory, 'reference-material.json');
  const output = 'public/reference-material';
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync('public/api/v1', { recursive: true });
  if (!fs.existsSync(configPath)) return;
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  for (const [id, source] of Object.entries(config.sources || {})) {
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid source id: ${id}`);
    if (!['public', 'encrypted'].includes(source.visibility)) {
      throw new Error(`Source ${id} needs visibility: public or encrypted`);
    }
    if (!Number.isInteger(source.pageOffset || 0))
      throw new Error('Invalid page offset');
    if (
      source.visibility === 'encrypted' &&
      !process.env.FAMILY_TREE_PASSWORD
    ) {
      throw new Error(`Source ${id} requires FAMILY_TREE_PASSWORD`);
    }
    const bytes = fs.readFileSync(path.resolve(directory, source.file));
    if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-')))
      throw new Error(`${id} is not a PDF`);
    const metadata = {
      title: source.title || id,
      pageOffset: source.pageOffset || 0,
    };
    if (source.ocr) {
      metadata.ocr = JSON.parse(fs.readFileSync(path.resolve(directory, source.ocr), 'utf8'));
    }
    if (source.visibility === 'public') {
      fs.writeFileSync(`${output}/${id}.pdf`, bytes);
      metadata.url = `/reference-material/${id}.pdf`;
      fs.writeFileSync(`${output}/${id}.json`, JSON.stringify(metadata));
    } else {
      metadata.data = bytes.toString('base64');
      fs.writeFileSync(
        `public/api/v1/source-${id}.json`,
        JSON.stringify(metadata),
      );
    }
  }
}
if (require.main === module) prepareCitations(process.argv[2]);
module.exports = { prepareCitations };
