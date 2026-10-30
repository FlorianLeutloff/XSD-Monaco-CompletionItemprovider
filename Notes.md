## Particularities of the DomParser

### 18.09.2026 - />
When using the DomParser to read an XSD-Script, it will disregard the closing bracket of a single line markup-element and therefore make that element parochial to all text below it. Therefore everything is a child of import statements.

Future solution: 
/> replaced with ><\/elementname> as an easy workaround


### 30.10.2026 attribute insertion problem - aesthetic/comfort issue
The editor has issues with giving suggestions for attributes of an element
putting a space between the closing bracket and the element name will not activate the suggestion properly, it instead needs to be reconfirmed with your mouse cursor, for a suggestion to be properly made
This is probably an issue around the position and range assumptions of the editor.
The editor will also not permit suggestions to be made, immediately after the name-text of an element <styledlayerdescriptor|> is not a valid insertion point for it to give suggestions