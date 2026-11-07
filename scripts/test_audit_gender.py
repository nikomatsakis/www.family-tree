import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('audit_gender', Path(__file__).with_name('audit-gender.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def row(gender, name, spouse=0, altid=''):
    return f' 1 0 0 0 0 0 0 0 0 0 {gender} 0 0 {spouse} {altid}{name}\n'

class AuditTests(unittest.TestCase):
    def test_partner_after_children(self):
        data = row('M','Alpha') + row('F','Beta',1)
        data += ' 1 1 0 0 0 0 0 0 0 0 F 0 0 0         Gamma\n'
        data += row('M','Delta',2)
        # Pairing must track ancestor records, not simply the most recent primary.
        self.assertTrue(any('partnership' in msg for _,msg in module.audit(data)))

    def test_unknown_and_mixed_partners(self):
        self.assertFalse(module.audit(row('M','Alpha')+row('F','Beta',1)))
        self.assertFalse(module.audit(row('?','Alpha')+row('F','Beta',1)))
        self.assertTrue(any('partnership' in msg for _,msg in module.audit(row('F','Alpha')+row('F','Beta',1))))

    def test_name_hints_and_placeholders(self):
        self.assertEqual(len(module.audit(row('F','Georgios Example'))),1)
        self.assertEqual(len(module.audit(row('M','Daughter2 Example'))),1)
        self.assertFalse(module.audit(row('?','Daughter Example')))

    def test_statistics_exclude_linked_rows(self):
        data = ''.join(row('M',f'Alex Example{i}') for i in range(9))
        self.assertEqual(len(module.audit(data+row('F','Alex Other'))),1)
        self.assertFalse(module.audit(data+row('F','Alex Linked',0,'2000000 ')))

if __name__ == '__main__':
    unittest.main()
