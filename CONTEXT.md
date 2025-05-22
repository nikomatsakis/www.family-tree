# AI Context Guide - Family Tree Project

This document provides essential context for AI assistants working on extending the family tree application with enhanced visualizations, search capabilities, and user experience features.

## Project Overview

A genealogy application using Rust for data processing and Ember.js for the frontend, designed to visualize and navigate complex family relationships using the Henry numbering system.

**Repository:** https://github.com/nikomatsakis/www.family-tree

## Architecture Summary

### Backend (Rust)
- **Main crate:** `family-tree` 
- **Core module:** `genea.rs` - Contains the main data structures and parsing logic
- **Data processing:** Parses `genea.doc` file format into structured JSON API
- **Output:** Generates JSON:API compliant data in `public/api/v1/`

**Key Rust structures:**
```rust
struct Genea {
    people: Vec<PersonData>,
    partnerships: Vec<PartnershipData>,
    maintainer_link: Option<String>,
}

struct PersonData {
    henry_number: Option<HenryNumber>, // None for spouses without ancestral info
    name: String,
    comments: String,
    private_comments: String,
    gender: Gender,
    child_in: Option<Partnership>,      // Which partnership they're a child of
    parent_in: Vec<Partnership>,        // Partnerships where they're a parent
    num_spouses: usize,
    num_kids: usize,
}

struct PartnershipData {
    parents: BTreeSet<Person>,  // Usually 2 people
    children: Vec<Person>,
}
```

### Frontend (Ember.js)
- **Framework:** Ember 5.11 (Octane edition)
- **Data layer:** Ember Data 5.3 with JSON:API adapter
- **Build system:** Embroider for modern builds
- **API namespace:** `api/v1`
- **Current routes:** Basic person detail view (`/person/:id`)

## Data Format: Henry Numbering System

**Core concept:** Hierarchical numbering system for tracking genealogical relationships.

### Henry Number Structure
- **Format:** 10-digit sequence (e.g., `1 2 1 2 0 0 0 0 0 0`)
- **Root ancestors:** 8 "primal ancestors" numbered 1-8
- **Hierarchy:** Each position represents a generation/relationship level
- **Example:** Person `1-2-1-2` = 2nd child of 1st child of 2nd child of 1st primal ancestor

### Input Data Format (`genea.doc`)
```
Henry Numbers | Gender | #Kids | #Spouses | SpouseIndex | AltID | Name\Comments;PrivateComments

 1 0 0 0 0 0 0 0 0 0 M 1 0 0         Solkar\Primal ancestor of the tree
 1 1 0 0 0 0 0 0 0 0 M 2 2 0         Skon
 1 1 0 0 0 0 0 0 0 0 F 0 0 1         T'Melis
 1 1 0 0 0 0 0 0 0 0 F 0 0 2         T'Rama
 1 1 1 0 0 0 0 0 0 0 M 3 3 0         Sarek\Vulcan pioneer
 1 1 1 0 0 0 0 0 0 0 F 1 0 1         T'Rea\First wife of Sarek
 1 1 1 1 0 0 0 0 0 0 M 1 0 0         Sybok
 1 1 1 1 1 0 0 0 0 0 M 0 0 0         Teska\Spock's niece from the novel Mind Meld, unknown parentage
 1 1 1 0 0 0 0 0 0 0 F 2 0 2 2100000 Amanda Grayson\Human
```

**Field meanings:**
- **Henry Numbers:** 10 space-separated digits for position in family tree
- **Gender:** M/F/?
- **#Kids, #Spouses:** Count of children and spouses
- **SpouseIndex:** 0=primary descendant, 1+=spouse without ancestral info
- **AltID:** Alternative Henry number (for people appearing in multiple lines)
- **Name\Comments;Private:** Name, public comments after `\`, private after `;`

### Key Data Characteristics
- **8 root family lines** covering multiple centuries
- **Geographic spread:** Greece (Karpathos), US, Australia, Europe
- **Cross-references:** People appear in multiple family lines via marriage
- **Rich metadata:** Professions, locations, birth/death dates, life events
- **Complex relationships:** Multiple marriages, divorces, adoptions

## Current Technical Implementation

### Rust Data Processing
```bash
# Build and run data generation
cargo run -- serve genea.doc    # Generates JSON API + starts Ember server
cargo run -- json genea.doc output/   # Just generate JSON files
```

### Ember App Structure
```javascript
// API configuration
setBuildURLConfig({ namespace: 'api/v1' });

// Current routing
Router.map(function () {
  this.route('person', { path: '/person/:id' });
});
```

### JSON:API Output Structure
The Rust backend generates JSON:API compliant data with:
- **People:** Individual person records with attributes and relationships
- **Partnerships:** Marriage/relationship records linking people
- **Root endpoint:** Entry point listing root ancestors

## Priority Enhancement Areas

### 1. Visualization Features
**Current:** Basic HTML list navigation
**Needed:** 
- Interactive family tree diagrams (D3.js, vis.js)
- Timeline views showing generations
- Relationship network graphs
- Geographic migration maps

### 2. Search & Navigation
**Current:** Manual navigation through family links
**Needed:**
- Full-text search across names, comments, locations
- Advanced filtering (generation, location, profession, dates)
- "Find relationship path" between any two people
- Breadcrumb navigation showing ancestral paths

### 3. User Experience
**Current:** Desktop-focused basic interface
**Needed:**
- Mobile-responsive design
- Print-friendly family tree layouts
- Photo/media support for individuals
- Statistics and insights dashboard

### 4. Data Features
**Potential additions:**
- GEDCOM import/export compatibility
- Data validation and consistency checking
- Collaborative editing capabilities
- Privacy controls for sensitive information

## Development Priorities

When extending this application, focus on:

1. **Leverage existing data richness** - The Henry numbering system provides excellent relationship mapping
2. **Maintain performance** - Large family datasets need efficient querying and rendering
3. **Preserve data integrity** - Complex cross-references require careful relationship handling
4. **Mobile-first approach** - Family trees are often shared/viewed on mobile devices

## Quick Start for AI Assistants

To effectively help with this project:

1. **Review the core data structures** in `genea.rs` to understand the relationship model
2. **Examine the sample data** to see the complexity and richness available
3. **Check current Ember routes/components** to understand existing UI patterns
4. **Consider the Henry numbering system** when designing navigation/search features

The codebase is well-structured with clear separation between data processing (Rust) and presentation (Ember), making it ideal for focused enhancements to either layer.
