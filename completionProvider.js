

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
	console.log("findReference:");
	console.log(element);
	const attributeNames = element.getAttributeNames();
	let referenceData = {};
	if(attributeNames.includes("ref")) {
		referenceData = getElementReferenceData(element,"ref");
	}
	
	
	if(attributeNames.includes("type") && !attributeNames.includes("name")) {
		referenceData = getElementReferenceData(element,"type");
	}

	console.log(referenceData);
	if(referenceData.name) {
		const result = searchElementFromReferenceData(referenceData);
		if(result) {
			console.log("returning found reference")
			console.log(result);
			return result;
		}
	}
	console.log("returning Original Element")
	return element
}

function resolveNamedElementWithType(element) {
	console.log("resolveNamedElementWithType:")
	console.log(element)
	const attributeNames = element.getAttributeNames();
	if(attributeNames.includes("type") && attributeNames.includes("name")) {
		try {	
			const referenceData = getElementReferenceData(element,"type");
			const complexType = searchElementFromReferenceData(referenceData);
			console.log(complexType);
			if(complexType) {
				return complexType
			}
		} catch(exception) {
			console.warn("Exception during resolveNamedElementWithType")
		}
	}
	console.log("Returning original Element")
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
	console.log("getNamespaceOfelement");
	console.log(element);
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

function findElements(elements, elementName) {
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
			console.log(substitutesArray);
			for(let s = 0; s < substitutesArray.length; s++) {
				elementArray.push(substitutesArray[s])
			}

			if(currentElement.tagName === 'EXTENSION') {
				const extensionResult = resolveExtensions(currentElement);
				if(extensionResult) {
					console.log(extensionResult)
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

				/*
				if(namedTypedElement) {
					const currentElementType = resolveNamedElementWithType(currentElement);
					child = findElements(currentElementType.children, elementName);
				} else {
					child = findElements(currentElement.children, elementName);

				}
				*/
				console.log("Skipping Level Child Result");
				console.log(child);
				// if child exists, return it
				if (child) {
					return child;
				}
			}
			// if there is no elementName, return all elements (we'll explain
			// this bit little later
			else if (!elementName) {
				console.log("BEFORE DEREFERNCING")
				console.log(elementArray);
				const deferencedElements = resolveReferenceList(elementArray);
				console.log("DeReferencedElements:")
				console.log(deferencedElements);
				for(const element_iii of deferencedElements) {
					console.log(element_iii)
				}
				return deferencedElements;
			}
			// find all the element attributes, and if it't name is the same
			// as the element we're looking for, return the element.
			else {
				const elementAttributes = getElementAttributes(currentElement);
				try {
					if(elementAttributes.name.toUpperCase() === elementName) {
						return currentElement;
					}
				} catch(exception) {
					console.warn("Error getting name from element:")
					console.log(currentElement)
				}
			} 
		}
	}
	console.log("findElements Method End returning undefined");
}

function findAttributes(elements) {
	console.log("findAttributes");
	console.log(elements)
	var attrs = [];
	for (var i = 0; i < elements.length; i++) {
		// skip level if it is a 'complexType' tag
		if (shouldSkipLevel(elements[i].tagName)) {
			console.log("skip Level")
			console.log(elements[i])
			var child = findAttributes(elements[i].children);
			if (child.length > 0) {
				console.log("findAttributes Child from")
				console.log(elements[i])
				console.log("child")
				console.log(child)

				return child;
			}
		}
		// we need only those XSD elements that have a
		// tag 'attribute'
		else if (elements[i].tagName === 'ATTRIBUTE') {
			attrs.push(elements[i]);
		}
	}
	console.log("findAttributes Return attrs:")
	console.log(attrs)
	return attrs;
}

function getElementAttributes(element) {
	var attrs = {};
	for (var i = 0; i < element.attributes.length; i++) {
		attrs[element.attributes[i].name] = element.attributes[i].value;
	}
	// return all attributes as an object
	//console.log("getElementAttributes")
	//console.log(attrs)
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
		console.log("ITA R1")
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
	console.log("ITA R2")
	console.log(count === 0)
	console.log(parseInt(maxOccurs) > count)
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
	console.log(currentItem);


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
	console.log("ForLoop")
	for (var i = 0; i < children.length; i++) {
		console.log(i);
		console.log(children[i]);
		// get all element attributes
		let elementAttrs = getElementAttributes(children[i]);
		console.log(elementAttrs);
		// the element is a suggestion if it's available
		if (isItemAvailable(elementAttrs.name, elementAttrs.maxoccurs, usedItems)) {
			// mark it as a 'field', and get the documentation

			//if it has a name, therefore could be resolved to a reference somewhere else
			if(elementAttrs.name) {
				availableItems.push({
					label: elementAttrs.name,
					kind: monaco.languages.CompletionItemKind.Field,
					detail: elementAttrs.type,
					documentation: getItemDocumentation(children[i]),
					insertText: `${elementAttrs.name}>\n\t$0\n</${elementAttrs.name}`,
					insertTextRules: 4
				});
			}
			console.log("Push Succesful")
		}
	}
	// return the suggestions we found
	console.log(availableItems)
	return availableItems;
}

function getAvailableAttribute(monaco, elements, usedChildTags) {
	console.log("----------------------- GET AVAILABLE ATTRIBUTES -------------------------")
	console.log(elements);
	var availableItems = [];
	var children;
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
	console.log(children)
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
	console.log(availableItems);
	return availableItems;
}

function getXmlCompletionProvider(monaco) {
	return {
		triggerCharacters: ['<'],
		provideCompletionItems: function(model, position) {
			console.log("CPI 1")
            // get editor content before the pointer
			var textUntilPosition = model.getValueInRange({startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column});
			console.log("CPI 2")
            // get content info - are we inside of the area where we don't want suggestions, what is the content without those areas
			var areaUntilPositionInfo = getAreaInfo(textUntilPosition); // isCompletionAvailable, clearedText
			console.log("CPI 3")
            // if we don't want any suggestions, return empty array
			if (!areaUntilPositionInfo.isCompletionAvailable) {
				return [];
			}
			console.log("CPI 4")
            // if we want suggestions, inside of which tag are we?
			var lastOpenedTag = getLastOpenedTag(areaUntilPositionInfo.clearedText);
			console.log("CPI 5")
            // get opened tags to see what tag we should look for in the XSD schema
			var openedTags = [];
            // get the elements/attributes that are already mentioned in the element we're in
			var usedItems = [];
			var isAttributeSearch = lastOpenedTag && lastOpenedTag.isAttributeSearch;
			console.log("CPI 6")
			// no need to calculate the position in the XSD schema if we are in the root element
			if (lastOpenedTag) {
				console.log("CPI 7 - LastOpenedTag")
				console.log(lastOpenedTag)
				// parse the content (not cleared text) into an xml document
				console.log(textUntilPosition)
				if(lastOpenedTag.isAttributeSearch) {
					textUntilPosition = textUntilPosition + ">"
				} 
				var xmlDoc = stringToXml(textUntilPosition,true);
				console.log("CPI 7.1")
				var lastChild = xmlDoc.lastElementChild;
				console.log("CPI 7.2")
				while (lastChild) {
					console.log("CPI 7.3 - LastChild")
					console.log(lastChild);
					openedTags.push(lastChild.tagName);
					console.log("CPI 7.3.1")
					// if we found our last opened tag
					console.log(lastChild.tagName)
					console.log(lastOpenedTag.tagName)
					if (lastChild.tagName === lastOpenedTag.tagName) {
						console.log("CPI 7.3.2")
						// if we are looking for attributes, then used items should
						// be the attributes we already used
						if (lastOpenedTag.isAttributeSearch) {
							console.log("CPI 7.3.2.3")
							var attrs = lastChild.attributes;
							console.log("CPI 7.3.2.3.1")
							for (var i = 0; i< attrs.length; i++) {
								console.log("CPI 7.3.2.3.2")
								usedItems.push(attrs[i].nodeName);
							}
						}
						else {
							console.log("CPI 7.3.2.4")
							console.log(lastChild)
							// if we are looking for child elements, then used items
							// should be the elements that were already used
							var children = lastChild.children;
							console.log("CPI 7.3.2.4.1")
							for (var i = 0; i < children.length; i++) {
								console.log("CPI 7.3.2.4.2")
								usedItems.push(children[i].tagName);
							}
						}
						console.log("CPI 7.3.3")
						console.log(usedItems);
						break;
					}
					// we haven't found the last opened tag yet, so we move to
					// the next element
					lastChild = lastChild.lastElementChild;
					console.log("CPI 7.4")
				}
			}
            // find the last opened tag in the schema to see what elements/attributes it can have
			var currentItem = schemaDictionary['sld'];
			console.log("CPI 7.5")
			console.log(openedTags);
			for (var i = 0; i < openedTags.length; i++) {
				console.log("CPI 7.6 - OpenedTags and CurrentItem")
				console.log(openedTags[i])
				console.log(currentItem)
				if (currentItem) {
					console.log("CPI 7.7")
					const currentItemAttributes = currentItem.getAttributeNames();
					const namedTypedElement = currentItemAttributes.includes("name") && currentItemAttributes.includes("type")
					currentItem = findElements(namedTypedElement ? [resolveNamedElementWithType(currentItem)] : currentItem.children, openedTags[i]);
					//currentItem = findElements(currentItem.children, openedTags[i]);
					console.log("CPI 7.8 - currentItem Result")
					console.log(currentItem)
				}
			}

            // return available elements/attributes if the tag exists in the schema, or an empty
            // array if it doesn't
			console.log("CURRENT ITEM")
			console.log(currentItem);
			if (isAttributeSearch) {
				console.log("CPI 7.9")
				// get attributes completions
				const result = currentItem ? getAvailableAttribute(monaco, currentItem.children, usedItems) : [];
				console.log("RESULT:")
				console.log(result);
				return { suggestions: result };
			}
			else {
				console.log("CPI 7.10 currentItem")
				console.log(currentItem)
				// get elements completions
				const result = currentItem ? getAvailableElements(monaco, currentItem, usedItems) : [];
				console.log("RESULT:")
				console.log(result);
				return { suggestions: result };
				//return currentItem ? getAvailableElements(monaco, currentItem.children, usedItems) : [];
			}
		}
	}
}