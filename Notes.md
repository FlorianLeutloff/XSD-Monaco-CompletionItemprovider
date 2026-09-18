## Particularities of the DomParser

### 18.09.2026 - />
When using the DomParser to read an XSD-Script, it will disregard the closing bracket of a single line markup-element and therefore make that element parochial to all text below it. Therefore everything is a child of import statements.

Future solution: 
/> replaced with ><\/elementname> as an easy workaround
