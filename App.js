//Importing the required packages
const request = require("request-promise");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const himalaya = require("himalaya");
const fs = require("fs");
var Obj = [];
var jsonLocatorData = [];
//Navigating to the website using requests

async function navigateToWebsiteUsingRequest(URL) {
  await request.get(URL);
}

//check whether the page is angualar or not
function checkPageType() {
  try {
    //code to check if the website is a angular by typing "angular" to console

  } catch (e) {
    console.log("It is a Non Angular Website");
  }
}

//Naviagate to webpage using puppetter
async function navigateToWebsiteUsingPuppetter(URL, versioNumber) {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    console.log("On page " + URL);
    const html = await page.content();
    const $ = cheerio.load(html);
    var json = himalaya.parse(html);
    fs.writeFileSync(
      "version" + versioNumber + "/data.json",
      JSON.stringify(json, null, "\t")
    );
    readDataFromJson(versioNumber);
    browser.close();
  } catch (e) {
    console.log(e, "ERROR!! while launching and loading the URL");
  }
}

//Reading the data from the json created and creating locators.
function readDataFromJson(versionNumber) {
  fs.readFile("version" + versionNumber + "/data.json", function (err, data) {
    try {
      var jsonData = data;
      parsedJsonData = JSON.parse(jsonData);
      htmlTagData = getObjectDataFromTagName(parsedJsonData, "html");
      bodyElementData = getObjectDataFromTagName(htmlTagData, "body");
      absTag = "//body";
      traverse(bodyElementData, versionNumber, absTag);
    } catch (err) {
      console.log("ERRROR while reading data from json");
      //console.log(err);
    }
  });
}

//return the child object of the jsonData of particular htmlTag
function getObjectDataFromTagName(jsonData, nameOfTag) {
  for (i = 0; i < jsonData.length; i++) {
    if (jsonData[i].tagName == nameOfTag) {
      return jsonData[i].children;
    }
  }
}
//Traverse forward in a json file
function traverse(data, versionNumber, absTag) {
  if (data.length == 0) {
    return;
  }
  data.forEach(function (element) {
    if (
      element.hasOwnProperty("tagName") &&
      element.hasOwnProperty("attributes") &&
      element.hasOwnProperty("children")
    ) {
      if (!absTag.includes(element.tagName)) {
        absTag = absTag + "/" + element.tagName;
      }
      createLocator(element.attributes, element.tagName, absTag, versionNumber);
      traverse(element.children, versionNumber, absTag);
    }
  });
}

//create a Relative xpath locators by using data from json file
function createLocator(attributesData, tagName, absTag, versionNumber) {
  if (attributesData.length == 0) {
    return;
  }
  var validNames = {
    tagNames: [
      "div",
      "span",
      "a",
      "img",
      "input",
      "href",
      "li",
      "td",
      "form",
      "textarea",
      "center",
      "h1",
    ],
    attr: [
      "id",
      "class",
      "name",
      "rows",
      "cols",
      "img",
      "href",
      "tr",
      "onclick",
      "onsubmit",
      "title",
    ]
  };
  if (validNames.tagNames.includes(tagName)) {
    for (i = 0; i < attributesData.length; i++) {
      if (validNames.attr.includes(attributesData[i].key)) {
        locator =
          "//" +
          tagName +
          "[@" +
          attributesData[i].key +
          '="' +
          attributesData[i].value +
          '"]';
        absTag = absTag + "[" + i + "]" + "/" + attributesData[i].key;
        /*
        To write the locators to a .txt file
         */
        // fs.appendFileSync(
        //   "version" + versionNumber + "/locators.txt",
        //   locator.concat("\n"),
        //   function (err) {
        //     console.log(err);
        //   }
        // );

        //pushing each locator to array
        Obj.push({
          RelXpath: locator,
          UniqueKey: absTag,
        });
        //console.log(Obj);
        writeLocator(versionNumber);
      }
    }
  }
}

//write locator to the file
function writeLocator(versionNumber) {
  var ObjJson = JSON.stringify(Obj, null, "\t");
  fs.writeFileSync(
    "version" + versionNumber + "/locators.json",
    ObjJson,
    function (err) {
      console.log(err);
    }
  );
}

/*
  Comparing versions for change or new Locators
  Parameters- version1- locatorsJson file of version 1
              version2-LocatorsJson file of 2nd version
*/
function compareVersions(version1, version2) {
  var locatorsJsonData1 = getLocatorsDataBasedonVersion(version1);
  var locatorsJsonData2 = getLocatorsDataBasedonVersion(version2);

  if (locatorsJsonData1.length >= locatorsJsonData2) {
    segregateLocators(locatorsJsonData1, locatorsJsonData2);
  } else {
    segregateLocators(locatorsJsonData2, locatorsJsonData1);
  }

  finalStatement =
    "\nThere were " +
    locatorsJsonData1.length +
    " locators in Version " +
    version1 +
    " .\nThere are " +
    locatorsJsonData2.length +
    " locators in version " +
    version2;

  writeFinalLocators(finalStatement);
}

/*
  Extract the locators data from the respective json version files 
*/

function getLocatorsDataBasedonVersion(versionNumber) {
  var data = fs.readFileSync("version" + versionNumber + "/locators.json");
  jsonLocatorData = JSON.parse(data);
  return jsonLocatorData;
}

//Seperate Locators based on the two JSON files and add it to new final Locators file
function segregateLocators(locatorsData1, locatorsData2) {
  //Checking -New OR Modified OR common Locators from previous version
  for (i = 0; i < locatorsData1.length; i++) {
    eachKey = locatorsData1[i].UniqueKey;
    itsLocatorValue = locatorsData1[i].RelXpath;

    if (isLocatorPresentInOtherVersion(eachKey, locatorsData2)) {
      locatorValueFromOtherVersion = getValueForKeyInOtherVersion(eachKey);
      if (locatorValueFromOtherVersion == itsLocatorValue) {
        console.log("same locator");
        locator =
          itsLocatorValue +
          "        This locator is Unchanged across versions .";
        writeFinalLocators(locator);
      } else {
        console.log("modified Locator");
        locator =
          locatorValueFromOtherVersion +
          "   is changed to   " +
          itsLocatorValue;
        writeFinalLocators(locator);
      }
    } else {
      console.log("new Locator");
      locator = itsLocatorValue + "        this is  a New Locator ";
      writeFinalLocators(locator);
    }
  }

  //Checking for Deleted Locators from 1 st Version

  for (k = 0; k < locatorsData2.length; k++) {
    eachKey = locatorsData2[k].UniqueKey;
    locatorsValue = locatorsData2[k].RelXpath;

    if (!isLocatorPresentInOtherVersion(eachKey, locatorsData1)) {
      console.log("Deleted Locater");
      locator = locatorsValue + "      This locator is Deleted";
      writeFinalLocators(locator);
    }
  }

  function isLocatorPresentInOtherVersion(keyToBeSearched, DataToBeSearchedIn) {
    for (j = 0; j < DataToBeSearchedIn.length; j++) {
      eachKey = DataToBeSearchedIn[j].UniqueKey;
      if (eachKey === keyToBeSearched) {
        return true;
      }
    }
    return false;
  }

  function getValueForKeyInOtherVersion(keyToBeSearched) {
    for (j = 0; j < locatorsData2.length; j++) {
      eachKey = locatorsData2[j].UniqueKey;
      if (eachKey == keyToBeSearched) {
        return locatorsData2[j].RelXpath;
      }
    }
  }
}

function writeFinalLocators(locator) {
  fs.appendFileSync("finalLocators.txt", locator.concat("\n"), function (err) {
    if (err) {
      console.log("Error while entering final locators");
    }
  });
}

//Main function
(function main() {
  navigateToWebsiteUsingPuppetter(
    "http://127.0.0.1:5500/Locators-Automation/version1/index.html",
    1
  );
  // navigateToWebsiteUsingPuppetter(
  //   "http://127.0.0.1:5500/Locators-Automation/version2/index.html",
  //   2
  // );
   compareVersions(1, 2);

})();

// navigateToWebsiteUsingPuppetter(
//   "https://www.w3schools.com/html/html_basic.asp",
//   3
// );


