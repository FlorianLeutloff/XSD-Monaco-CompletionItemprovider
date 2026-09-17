var xmlSchemaString =
`<?xml version="1.0" encoding="UTF-8" ?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
<xs:element name="shiporder">
  <xs:annotation>
    <xs:documentation>Details for order shipping.</xs:documentation>
  </xs:annotation>
  <xs:complexType>
    <xs:sequence>
      <xs:element name="orderperson" type="xs:string">
      <xs:annotation>
        <xs:documentation>Person that will handle the order.</xs:documentation>
      </xs:annotation>
      </xs:element>
      <xs:element name="shipto">
        <xs:annotation>
          <xs:documentation>Details of order reciever.</xs:documentation>
        </xs:annotation>
        <xs:complexType>
          <xs:sequence>
            <xs:element name="name" type="xs:string">
              <xs:annotation>
                <xs:documentation>Receiver name.</xs:documentation>
              </xs:annotation>
            </xs:element>
            <xs:element name="address" type="xs:string">
              <xs:annotation>
                <xs:documentation>Receiver address.</xs:documentation>
              </xs:annotation>
            </xs:element>
            <xs:element name="city" type="xs:string">
              <xs:annotation>
                <xs:documentation>Receiver city.</xs:documentation>
              </xs:annotation>
            </xs:element>
            <xs:element name="country" type="xs:string">
              <xs:annotation>
                <xs:documentation>Receiver country.</xs:documentation>
              </xs:annotation>
            </xs:element>
          </xs:sequence>
        </xs:complexType>
      </xs:element>
      <xs:element name="item" maxOccurs="unbounded">
        <xs:annotation>
          <xs:documentation>Order item.</xs:documentation>
        </xs:annotation>
        <xs:complexType>
          <xs:sequence>
            <xs:element name="title" type="xs:string">
              <xs:annotation>
                <xs:documentation>Item title.</xs:documentation>
              </xs:annotation>
            </xs:element>
            <xs:element name="note" type="xs:string" minOccurs="0">
              <xs:annotation>
                <xs:documentation>Item note.</xs:documentation>
              </xs:annotation>
            </xs:element>
            <xs:element name="quantity" type="xs:positiveInteger">
              <xs:annotation>
                <xs:documentation>Quantity of the item.</xs:documentation>
              </xs:annotation>
            </xs:element>
            <xs:element name="price" type="xs:decimal">
              <xs:annotation>
                <xs:documentation>Item price.</xs:documentation>
              </xs:annotation>
            </xs:element>
          </xs:sequence>
        </xs:complexType>
      </xs:element>
    </xs:sequence>
    <xs:attribute name="orderid" type="xs:string" use="required">
      <xs:annotation>
        <xs:documentation>Attribute example.</xs:documentation>
      </xs:annotation>
    </xs:attribute>
  </xs:complexType>
</xs:element>
</xs:schema>`.replace(/xs\:/g, ''); // remove 'xs:' prefix for easier navigation later
//WIP: the prefix needs to be kept later on. It is important.

function stringToXml(text, airgap=false) {
  console.log("StringToXML")
	var xmlDoc;
	if (window.DOMParser) {
    console.log("DOMPARSER")
		var parser = new DOMParser();
    //originally text/xml
    //firefox handles domParser errors differently than other browsers, depending on the mimetype, by setting it to text/html it has behaviour similar to chrome
    //thereby that it parses the markup-language as far as able instead of just erroring out uselessly.
		xmlDoc = parser.parseFromString(text, 'text/html');
    try {
      //Due to text/html coming with additional bells and whistles, this extracts the content wanted from the xml, which is wrapped in an html->body shell
      xmlDoc = xmlDoc.getElementsByTagName("body");
      //the starting element of an xml-schema will not be considered, for xsds, you have schema as your airgap, for xml you keep body as the airgap
      if(airgap) {
        xmlDoc = xmlDoc[0]
      } else {
        xmlDoc = xmlDoc[0].children[0];
      }
    } catch (error) {
      console.error("Could not retrieve the body properly or the body is lacking children.")
    }

	}
	else {
    console.log("ACITVEXOBJECT")
		xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
		xmlDoc.async = false;
		xmlDoc.loadXML(text);
	}
  console.log(xmlDoc)
	return xmlDoc;
}

var schemaNode = stringToXml(xmlSchemaString,true).children[0];