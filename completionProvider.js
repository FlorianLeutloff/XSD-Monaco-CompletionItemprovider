

function getLastOpenedTag(text) {
	// get all tags inside of the content
	var tags = text.match(/<\/*(?=\S*)([a-zA-Z-]+)/g);
	if (!tags) {
		return undefined;
	}
	// we need to know which tags are closed
	var closingTags = [];
	for (var i = tags.length - 1; i >= 0; i--) {
		if (tags[i].indexOf('</') === 0) {
			closingTags.push(tags[i].substring('</'.length));
		}
		else {
			// get the last position of the tag
			var tagPosition = text.lastIndexOf(tags[i]);
			var tag = tags[i].substring('<'.length);
			var closingBracketIdx = text.indexOf('/>', tagPosition);
			// if the tag wasn't closed
			if (closingBracketIdx === -1) {
				// if there are no closing tags or the current tag wasn't closed
				if (!closingTags.length || closingTags[closingTags.length - 1] !== tag) {
					// we found our tag, but let's get the information if we are looking for
					// a child element or an attribute
					text = text.substring(tagPosition);
					return {
						//internal tagnames are kept as UpperCase for Firefox so it is easier to make the adjustment at this position
						tagName: tag.toUpperCase(),
						isAttributeSearch: text.indexOf('<') > text.indexOf('>')
					};
				}
				// remove the last closed tag
				closingTags.splice(closingTags.length - 1, 1);
			}
			// remove the last checked tag and continue processing the rest of the content
			text = text.substring(0, tagPosition);
		}
	}
}

function getAreaInfo(text) {
	// opening for strings, comments and CDATA
	var items = ['"', '\'', '<!--', '<![CDATA['];
	var isCompletionAvailable = true;
	// remove all comments, strings and CDATA
	text = text.replace(/"([^"\\]*(\\.[^"\\]*)*)"|\'([^\'\\]*(\\.[^\'\\]*)*)\'|<!--([\s\S])*?-->|<!\[CDATA\[(.*?)\]\]>/g, '');
	for (var i = 0; i < items.length; i++) {
		var itemIdx = text.indexOf(items[i]);
		if (itemIdx > -1) {
			// we are inside one of unavailable areas, so we remote that area
			// from our clear text
			text = text.substring(0, itemIdx);
			// and the completion is not available
			isCompletionAvailable = false;
		}
	}
	return {
		isCompletionAvailable: isCompletionAvailable,
		clearedText: text
	};
}

function shouldSkipLevel(tagName) {
	// if we look at the XSD schema, these nodes are containers for elements,
	// so we can skip that level
	return tagName === 'COMPLEXTYPE' || tagName === 'ALL' || tagName === 'SEQUENCE' || tagName === 'CHOICE' || tagName === 'COMPLEXCONTENT' || tagName === 'EXTENSION';
}

/*
	This will require later expansion due to a later requirement to support multiple XSD-Schema files instead of just one.
	xmlDoc will turn into a dictionary

*/
function findReference(element) {
	const attributeNames = element.getAttributeNames();
	let referenceData = {};
	if(attributeNames.includes("ref")) {
		referenceData = getElementReferenceData(element,"ref");
	}
	
	
	if(attributeNames.includes("type") && !attributeNames.includes("name")) {
		referenceData = getElementReferenceData(element,"type");
	}

	if(referenceData.name) {
		const result = searchElementFromReferenceData(referenceData);
		if(result) {
			return result;
		}
	}
	return element
}

function resolveNamedElementWithType(element) {
	const attributeNames = element.getAttributeNames();
	if(attributeNames.includes("type") && attributeNames.includes("name")) {
		try {	
			const referenceData = getElementReferenceData(element,"type");
			const complexType = searchElementFromReferenceData(referenceData);
			if(complexType) {
				return complexType
			}
		} catch(exception) {
			console.warn("Exception during resolveNamedElementWithType")
		}
	}
	return element;

}



function searchElementFromReferenceData(referenceData) {
	try {
		const result = schemaDictionary[referenceData.ns].querySelector(`[name="${referenceData.name}"]`)
		if(result) {
			return result;
		}			
	} catch(exception) {
		console.warn("Error during searchElementFromReferenceData: Probably due to an unknown namespace");
	}
	return undefined
}

function getNamespaceOfElement(element) {
	if(element.tagName === "SCHEMA") {
		const attributes = element.getAttributeNames();
		if(attributes.includes('targetnamespace')) {
			const targetNamespace = element.getAttribute("targetnamespace");
			if(targetNamespace.includes("/")) {
				const nameSpaceSplit = targetNamespace.split("/");
				return nameSpaceSplit[nameSpaceSplit.length -1];
			} else {
				return targetNamespace;
			}
		} else {
			return "";
		}
	} else {
		return getNamespaceOfElement(element.parentNode)
	}
}

function findElementSubstitutes(element) {
	if(element.getAttributeNames().includes("block") && element.getAttribute("block")==="substitution") {
		return []
	}
	const namespace = getNamespaceOfElement(element);
	const elementName = element.getAttribute("name");
	const elementReference = `${namespace}:${elementName}`
	return findElementSubstitutesByName(elementReference);
}

function findElementSubstitutesByName(fullRefName) {
	const keys = Object.keys(schemaDictionary);
	let searchResults = [];
	for(const key of keys) {
		try {
			searchResults = [...searchResults,...schemaDictionary[key].querySelectorAll(`[substitutionGroup="${fullRefName}"]`)];
		} catch(exception) {
			console.warn("ERROR FIND SUBSTITUTION GROUP")
			console.log(exception);
		}
	}
	//searchResults = schemaNode.querySelectorAll(`[substitutionGroup="${fullRefName}"]`);
	return searchResults;
}

function resolveElementSubstitutes(element) {
	console.log("------------ RESOLVE ELEMENT SUBSTITUTES ------------")
	console.log(element)
	const elementAttributes = element.getAttributeNames();
	if(elementAttributes.includes("ref")) {
		return findElementSubstitutesByName(element.getAttribute("ref"));
	}
	if(elementAttributes.includes("name")) {
		return findElementSubstitutes(element);
	}
	return [];
}


function resolveReferenceList(elements) {
	console.log("------------ RESOLVE REFERENCES ------------")
	console.log(elements);
	const elementsArray = [...elements]
	const resultList = []
	for(let i = 0; i < elementsArray.length; i++) {
		console.log("RESOLVING:")
		console.log(elementsArray[i])
		if(shouldSkipLevel(elementsArray[i].tagName)) {
			const subElements = findElements(elementsArray[i].children)
			for(sbe of subElements) {
				elementsArray.push(sbe);
			}
			continue;
		}
		const element = findReference(elementsArray[i]);
		console.log("FindElementSubstitutes:")
		const substitutesArray = findElementSubstitutes(element);
		console.log("Resulting Substitute Array")
		console.log(substitutesArray);
		for(let y = 0; y < substitutesArray.length; y++) {
			//avert duplicate entries due to substitutiongroups
			if(!elementsArray.includes(substitutesArray[y])) {
				elementsArray.push(substitutesArray[y]);
			}
		}
		resultList.push(element);
	}
	return resultList;

}

function getElementReferenceData(element,key) {
	const attributeSplit = element.getAttribute(key).split(":");
	if(attributeSplit.length > 1) {
		return {ns: attributeSplit[0], name: attributeSplit[1]};
	} else {
		return {ns: "", name: attributeSplit[0]};
	}
}

function resolveExtensions(extension) {
	const extensionReference = extension.getAttribute("base") || ""
	if (extensionReference) {
		const referenceData = getElementReferenceData(extension, "base");
		try {
			const complexType = schemaDictionary[referenceData.ns].querySelector(`[name="${referenceData.name}"]`) || undefined;
			return complexType;
		} catch(exception) {
			console.warn("Resolve Extension Error: returning undefined")
			return undefined;
		}
		//const complexType = schemaNode.querySelector(`[name="${referenceData.name}"]`) || undefined;
		//return complexType;
	} else {
		return undefined;
	}
}

function findElements(elements, elementName, elementNameSpace) {
	const elementArray = [...elements]
	if(elementName) {
		elementName = elementName.toUpperCase();
	}
	console.log("FindElements")
	console.log(elementArray)
	console.log(elementName)
	for (var i = 0; i < elementArray.length; i++) {
		// we are looking for elements, so we don't need to process annotations and attributes
		console.log(elementArray[i])
		if (elementArray[i].tagName !== 'ANNOTATION' && elementArray[i].tagName !== 'ATTRIBUTE') {
			// if it is one of the nodes that do not have the info we need, skip it
			// and process that node's child items
			let currentElement = findReference(elementArray[i])
			//currentElement = resolveNamedElementWithType(currentElement);


			const substitutesArray = resolveElementSubstitutes(currentElement);
			for(let s = 0; s < substitutesArray.length; s++) {
				elementArray.push(substitutesArray[s])
			}

			if(currentElement.tagName === 'EXTENSION') {
				const extensionResult = resolveExtensions(currentElement);
				if(extensionResult) {
					elementArray.push(extensionResult);
				}
			}
			const currentElementAttributes = currentElement.getAttributeNames();
			//const namedTypedElement = currentElementAttributes.includes("name") && currentElementAttributes.includes("type")
			const skipLevel = shouldSkipLevel(currentElement.tagName)

			
			if (skipLevel) {
				console.log("Skipping Level");
				var child = undefined
				child = findElements(currentElement.children, elementName);


				if (child) {
					return child;
				}
			}
			else if (!elementName) {
				const deferencedElements = resolveReferenceList(elementArray);
				return deferencedElements;
			}
			// find all the element attributes, and if it't name is the same
			// as the element we're looking for, return the element.
			else {
				const elementAttributes = getElementAttributes(currentElement);
				try {
				const namespace = getNamespaceOfElement(currentElement)
				const comparisonNmae = `${namespace}:${elementAttributes.name}`.toUpperCase()					
					if(comparisonNmae === elementName) {
						return currentElement;
					}
				} catch(exception) {
					console.warn("Error getting name from element:")
					console.log(currentElement)
				}
			} 
		}
	}
}

function findAttributes(elements) {
	console.log("findAttributes");
	console.log(elements)
	var attrs = [];
	for (var i = 0; i < elements.length; i++) {
		// skip level if it is a 'complexType' tag
		if (shouldSkipLevel(elements[i].tagName)) {
			var child = findAttributes(elements[i].children);
			if (child.length > 0) {
				return child;
			}
		}
		// we need only those XSD elements that have a
		// tag 'attribute'
		else if (elements[i].tagName === 'ATTRIBUTE') {
			attrs.push(elements[i]);
		}
	}
	return attrs;
}

function getElementAttributes(element) {
	var attrs = {};
	for (var i = 0; i < element.attributes.length; i++) {
		attrs[element.attributes[i].name] = element.attributes[i].value;
	}
	return attrs;
}

function getItemDocumentation(element) {
	for (var i = 0; i < element.children.length; i++) {
		// annotaion contains documentation, so calculate the
		// documentation from it's child elements
		if (element.children[i].tagName === 'ANNOTATION') {
			return getItemDocumentation(element.children[0]);
		}
		// if it's the documentation element, just get the value
		else if (element.children[i].tagName === 'documentation') {
			return element.children[i].textContent;
		}
	}
}

function isItemAvailable(itemName, maxOccurs, items) {
	console.log("isItemAvailable")
	// the default for 'maxOccurs' is 1
	maxOccurs = maxOccurs || '1';
	// the element can appere infinite times, so it is availabel
	if (maxOccurs && maxOccurs === 'unbounded') {
		return true;
	}
	// count how many times the element appered
	var count = 0;
	for (var i = 0; i < items.length; i++) {
		if (items[i] === itemName) {
			count++;
		}
	}
	// if it didn't appear yet, or it can appear again, then it
	// is available, otherwise it't not
	return count === 0 || parseInt(maxOccurs) > count;
}


function getAvailableElements(monaco, currentItem, usedItems) {
	console.log("------------------- GET AVAILABLE ELEMENTS --------------------")
	console.log("GetAvailableElements: Elements - usedItems ")
	console.log(currentItem)
	console.log(usedItems)
	var availableItems = [];
	var children;
	const attributeNames = currentItem.getAttributeNames();
	var elements = []
	
	if(attributeNames.includes('name') && attributeNames.includes('type') && currentItem.children.length === 0) {
		elements = resolveNamedElementWithType(currentItem).children;
	} else {
		elements = currentItem.children;
	}

	console.log("ELEMENTS:")
	console.log(elements);

	for (var i = 0; i < elements.length; i++) {
		// annotation element only contains documentation,
		// so no need to process it here
		if (elements[i].tagName !== 'ANNOTATION') {
			// get all child elements that have 'element' tag
			children = findElements([elements[i]])
		}
	}
	// if there are no such elements, then there are no suggestions
	if (!children) {
		return [];
	}
	for (var i = 0; i < children.length; i++) {
		// get all element attributes
		let elementAttrs = getElementAttributes(children[i]);
		// the element is a suggestion if it's available
		if (isItemAvailable(elementAttrs.name, elementAttrs.maxoccurs, usedItems)) {
			let elementName = ""
			try{
				const namespace = getNamespaceOfElement(children[i]);
				elementName = `${namespace}:${elementAttrs.name}`
			} catch {
				elementName = elementAttrs.name;
			}
			// mark it as a 'field', and get the documentation

			//if it has a name, therefore could be resolved to a reference somewhere else
			if(elementAttrs.name) {
				availableItems.push({
					label: elementName,
					kind: monaco.languages.CompletionItemKind.Field,
					detail: elementAttrs.type,
					documentation: getItemDocumentation(children[i]),
					insertText: `${elementName}>\n\t$0\n</${elementName}`,
					insertTextRules: 4
				});
			}
			console.log("Push Succesful")
		}
	}
	// return the suggestions we found
	return availableItems;
}

function getAvailableAttribute(monaco, currentItem, usedChildTags) {
	console.log("----------------------- GET AVAILABLE ATTRIBUTES -------------------------")
	console.log(currentItem);
	var availableItems = [];
	var children;
	const attributeNames = currentItem.getAttributeNames();
	var elements = []
	
	if(attributeNames.includes('name') && attributeNames.includes('type') && currentItem.children.length === 0) {
		elements = resolveNamedElementWithType(currentItem).children;
	} else {
		elements = currentItem.children;
	}

	console.log("ELEMENTS:")
	console.log(elements);
	console.log(currentItem);	
	for (var i = 0; i < elements.length; i++) {
		// annotation element only contains documentation,
		// so no need to process it here
		if (elements[i].tagName !== 'ANNOTATION') {
			// get all child elements that have 'attribute' tag
			children = findAttributes([elements[i]])
		}
	}
	// if there are no attributes, then there are no
	// suggestions available
	if (!children) {
		console.log("No Attributes to suggest")
		return [];
	}
	for (var i = 0; i < children.length; i++) {
		// get all attributes for the element
		var attrs = getElementAttributes(children[i]);
		// accept it in a suggestion list only if it is available
		if (isItemAvailable(attrs.name, attrs.maxOccurs, usedChildTags)) {
			// mark it as a 'property', and get it's documentation
			availableItems.push({
				label: attrs.name,
				kind: monaco.languages.CompletionItemKind.Property,
				detail: attrs.type || "string",
				documentation: getItemDocumentation(children[i]),
				insertText: `${attrs.name}=""`,
				insertTextRules: 4		
			});
		}
	}
	// return the elements we found
	return availableItems;
}

function getXmlCompletionProvider(monaco) {
	return {
		triggerCharacters: ['<'],
		provideCompletionItems: function(model, position) {
            // get editor content before the pointer
			var textUntilPosition = model.getValueInRange({startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column});
            // get content info - are we inside of the area where we don't want suggestions, what is the content without those areas
			var areaUntilPositionInfo = getAreaInfo(textUntilPosition); // isCompletionAvailable, clearedText
            // if we don't want any suggestions, return empty array
			if (!areaUntilPositionInfo.isCompletionAvailable) {
				return [];
			}
            // if we want suggestions, inside of which tag are we?
			var lastOpenedTag = getLastOpenedTag(areaUntilPositionInfo.clearedText);
            // get opened tags to see what tag we should look for in the XSD schema
			var openedTags = [];
            // get the elements/attributes that are already mentioned in the element we're in
			var usedItems = [];
			var isAttributeSearch = lastOpenedTag && lastOpenedTag.isAttributeSearch;
			// no need to calculate the position in the XSD schema if we are in the root element
			if (lastOpenedTag) {
				// parse the content (not cleared text) into an xml document
				if(lastOpenedTag.isAttributeSearch) {
					textUntilPosition = textUntilPosition + ">"
				} 
				var xmlDoc = stringToXml(textUntilPosition,true);
				var lastChild = xmlDoc.lastElementChild;
				while (lastChild) {
					openedTags.push(lastChild.tagName);
					// if we found our last opened tag
					if (lastChild.tagName === lastOpenedTag.tagName) {
						// if we are looking for attributes, then used items should
						// be the attributes we already used
						if (lastOpenedTag.isAttributeSearch) {
							var attrs = lastChild.attributes;
							for (var i = 0; i< attrs.length; i++) {
								usedItems.push(attrs[i].nodeName);
							}
						}
						else {
							// if we are looking for child elements, then used items
							// should be the elements that were already used
							var children = lastChild.children;
							for (var i = 0; i < children.length; i++) {
								usedItems.push(children[i].tagName);
							}
						}
						break;
					}
					// we haven't found the last opened tag yet, so we move to
					// the next element
					lastChild = lastChild.lastElementChild;
				}
			}
            // find the last opened tag in the schema to see what elements/attributes it can have
			var currentItem = schemaDictionary['sld'];
			for (var i = 0; i < openedTags.length; i++) {
				if (currentItem) {
					const currentItemAttributes = currentItem.getAttributeNames();
					const namedTypedElement = currentItemAttributes.includes("name") && currentItemAttributes.includes("type")

					currentItem = findElements(namedTypedElement ? [resolveNamedElementWithType(currentItem)] : currentItem.children, openedTags[i]);
				}
			}

            // return available elements/attributes if the tag exists in the schema, or an empty
            // array if it doesn't
			if (isAttributeSearch) {
				// get attributes completions
				const result = currentItem ? getAvailableAttribute(monaco, currentItem, usedItems) : [];
				return { suggestions: result };
			}
			else {
				// get elements completions
				const result = currentItem ? getAvailableElements(monaco, currentItem, usedItems) : [];
				return { suggestions: result };
			}
		}
	}
}