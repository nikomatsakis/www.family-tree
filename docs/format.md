# Genea File Format

The `.genea` format represents family trees using a line-based text format where each line describes one person.

## File Structure

Each line follows this format:
```
<henry_numbers> <gender> <num_kids> <num_spouses> <spouse_index> [altid] <name>[\comment][;private]
```

### Example
```
 1 0 0 0 0 0 0 0 0 0 M 2 1 0         John Doe\engineer
 1 0 0 0 0 0 0 0 0 0 F 2 0 1 2000000 Jane Doe\artist
 1 1 0 0 0 0 0 0 0 0 M 0 0 0         John Jr\son
 1 2 0 0 0 0 0 0 0 0 F 0 0 0         Jane Jr\daughter
```

## Field Definitions

### Henry Numbers (10 fields)
The first 10 numeric fields represent the henry number - a hierarchical identifier showing family relationships:
- `1 0 0 0 0 0 0 0 0 0` = Person 1 (root ancestor)
- `1 1 0 0 0 0 0 0 0 0` = First child of person 1
- `1 2 0 0 0 0 0 0 0 0` = Second child of person 1
- `1 1 1 0 0 0 0 0 0 0` = First child of person 1-1

**Rules:**
- Children's henry numbers extend their parent's by one level
- Siblings have consecutive numbers at the same level
- The file must be sorted by henry number

### Gender
- `M` = Male
- `F` = Female  
- `?` = Unknown

### Count Fields
- `num_kids` = Number of children this person has
- `num_spouses` = Number of spouses/partners this person has

**Validation rules:**
- Primary spouses (spouse_index 0): counts must match actual relationships
- Secondary spouses (spouse_index ≠ 0): must declare 0/0 counts

### Spouse Index
- `0` = Primary spouse (owns the henry number)
- `1,2,3...` = Secondary spouses (married into this family line)

### Altid (Optional)
A reference to another henry number where this person appears:
- Only secondary spouses can have altids
- Points to the primary location where this person is defined
- Example: `2000000` points to henry number `2 0 0 0 0 0 0 0 0 0`

### Name and Comments
- `Name` = Person's full name
- `\comment` = Optional comment after backslash
- `;private` = Optional private comments (not displayed publicly)

## One-Way Altid System

The parser uses a "one-way" altid system for linking people who appear in multiple locations:

### Primary vs Secondary Spouses
- **Primary spouse** (spouse_index = 0): Owns their henry number, cannot have altids
- **Secondary spouse** (spouse_index ≠ 0): Either points to primary via altid OR is standalone

### Linking Rules
- Secondary spouses with altids must point to primary spouses
- Primary spouses define the canonical data (children, full comments)
- Secondary spouses with altids should only have names
- Names must match across altid references

### Example
```
# Primary location - John owns henry number 1
 1 0 0 0 0 0 0 0 0 0 M 2 1 0         John Doe\engineer
 1 0 0 0 0 0 0 0 0 0 F 2 0 1 2000000 Jane Doe

# Primary location - Jane owns henry number 2  
 2 0 0 0 0 0 0 0 0 0 F 2 1 0         Jane Doe\artist
 2 0 0 0 0 0 0 0 0 0 M 2 0 1 1000000 John Doe
```

## Validation Rules

The parser enforces these constraints:

### Count Validation
- Child counts only include direct children (one henry number level deeper)
- Spouse counts include all partners via altids
- Secondary spouses must declare 0 children and 0 spouses

### Duplicate Detection
- No person can have multiple children with the same name
- No person can have multiple spouses with the same name

### Altid Validation
- All altid references must point to existing people
- Names must match between altid references
- Unresolved altids generate suggestions for likely typos

### Ordering
- File must be sorted by henry number for correct parsing
- Children must appear after their parents

## Common Patterns

### Simple Family
```
 1 0 0 0 0 0 0 0 0 0 M 2 1 0         Father\profession
 1 0 0 0 0 0 0 0 0 0 F 2 0 1         Mother\profession  
 1 1 0 0 0 0 0 0 0 0 M 0 0 0         First Child
 1 2 0 0 0 0 0 0 0 0 F 0 0 0         Second Child
```

### Linked Families
```
# Smith family
 1 0 0 0 0 0 0 0 0 0 M 1 1 0         Bob Smith
 1 0 0 0 0 0 0 0 0 0 F 1 0 1 2000000 Alice Johnson
 1 1 0 0 0 0 0 0 0 0 F 0 0 0         Carol Smith

# Johnson family  
 2 0 0 0 0 0 0 0 0 0 F 1 1 0         Alice Johnson
 2 0 0 0 0 0 0 0 0 0 M 1 0 1 1000000 Bob Smith
 2 1 0 0 0 0 0 0 0 0 F 0 0 0         Carol Smith
```

This shows Alice and Bob appearing in both families via altid links, with their daughter Carol appearing in both trees.