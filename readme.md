# Description
The foundational code of the completionProvider is taken from the work of Ivana Simic in her article: https://mono.software/2017/04/11/custom-intellisense-with-monaco-editor/ and the github Repository https://github.com/isimic413/monaco-editor-custom-intellisense/tree/master/sample-editor

It serves as an excellent framework for writing your own completionItemProvider, but it has specific flaws, which this project will try to iron out. It is furthermore lacking in support for all XSD-features like extensions.

# Development decisions:
- 10.09.2026: on the assumption that no one would define two different XSD-Elements, which share the same name except for their capitalization, capitalization will be ignored when matching the XSD and the XML being edited. There are also issues with how the text is parsed into the DOM, which does ignore capitalization or sets the tagName variable as completely uppercase.