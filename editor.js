require.config({paths: { 'vs': '../node_modules/monaco-editor/min/vs' }});

require(['vs/editor/editor.main'], function() {
  console.log("EDITOR START 1");
	var editor = monaco.editor.create(document.getElementById('container'), {
		theme: 'vs-dark', // dark theme
		language: 'xml',
		suggestOnTriggerCharacters: true, // show suggestions when we type one of the trigger characters
		value: `<?xml version="1.0" encoding="UTF-8"?>

<StyledLayerDescriptor>

</StyledLayerDescriptor>` 
	});
  console.log(editor);

  // register a completion item provider for xml language
	monaco.languages.registerCompletionItemProvider('xml', getXmlCompletionProvider(monaco));
});