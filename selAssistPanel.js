
var angMain = angular.module('myApp', []);

angMain.controller('userInputController', ['$scope', function($scope){
	
	$scope.locator = ["Id", "Name", "Class Name", "Tag Name", "Link Text", "Partial Link Text", "CSS", "Xpath"];
	
	$scope.selection = "Xpath";
	
	$scope.userEntry = '';
	
	$scope.message = "";
    
    $scope.resultCount = 0;
    
	$scope.resultElements = [];
		
	// Reset message when locator selection changes
	$scope.$watch('selection', function(newVal, oldVal){
	    $scope.findElement($scope.userEntry, false);
	});

	$scope.copyLocatorValue = function(){		
	    var pathField = document.querySelector('#locatorValue');
		// select the contents
		pathField.select();
		   
		document.execCommand('copy');
	};

	$scope.clearLocatorValue = function(){
		$scope.userEntry = "";
		$scope.findElement($scope.userEntry, false);
	};

	$scope.findElement = function(textEntered, findEvent){
		//textEntered = textEntered.replace(/'/g, '"');

		// findEvent = true when element highlight needed else false
		if(textEntered != "")
		{			
			evaluateContentScript("inspect("+getLocatorText(textEntered, findEvent)+")", findEvent);
		}
		else
		{
			$scope.message = "";
		}
		
	};

	$scope.keyPress = function(keyCode){
		//console.log("userEntry after keypress - " +$scope.userEntry);
		if($scope.userEntry == undefined)
		{
			$scope.userEntry = "";
		}

		switch(keyCode){
			case 13:
				// Enter key pressed
				$scope.findElement($scope.userEntry, true);
				return;
				/*
			case 222:
				// pairing for key -> '
				$scope.userEntry = $scope.userEntry.replace(/'/g, "''");
				// pairing for key -> "
				$scope.userEntry = $scope.userEntry.replace(/"/g, '""');
				// replace ' with "
				$scope.userEntry = $scope.userEntry.replace(/'/g, '"');
				break;
			case 219:
				// pairing for key -> [
				$scope.userEntry = $scope.userEntry.replace(/\[/g, "[]");
				break;
			case 57:
				// pairing for key -> (
				$scope.userEntry = $scope.userEntry.replace(/\(/g, "()");
				break;
				*/			
		}
			
		// After every keypress display number of matching elements
		$scope.findElement($scope.userEntry, false);
						
	};
 
	function getLocatorText(enteredText, findEvent){
		var locatorType = $scope.selection.replace(/ /g, "").toUpperCase();
		var locatorTextSuffix = findEvent ? "[0]": ".length";
		//console.log(locatorType+ " | " +enteredText);

        var locatorText = generateDOMQueryString(locatorType, enteredText);

		if(locatorType != "ID")
			locatorText += locatorTextSuffix;

		//console.log("Locator text - "+ locatorText);

		return locatorText;
	};

    function generateDOMQueryString(locatorType, enteredText){
        var locatorText = "";
        
        switch(locatorType){
			case "ID":
				locatorText = "document.getElementById('"+enteredText+"')";
				break;
			case "NAME":
				locatorText = "document.getElementsByName('"+enteredText+"')";
				break;
			case "CLASSNAME":
				locatorText = "document.getElementsByClassName('"+enteredText+"')";
				break;
			case "TAGNAME":
				locatorText = "document.getElementsByTagName('"+enteredText+"')";
				break;
			case "LINKTEXT":
				enteredText = enteredText.replace(/'/g, "\'");
				locatorText = "$x(\"//a[.='"+enteredText+"']\")";
				break;
			case "PARTIALLINKTEXT":
				enteredText = enteredText.replace(/'/g, "\'");
				locatorText = "$x(\"//a[contains(text(),'"+enteredText+"')]\")";
				break;
			case "CSS":
				enteredText = enteredText.replace(/'/g, '"');
				locatorText = "$$('"+enteredText+"')";
				break;
			case "XPATH":
				enteredText = enteredText.replace(/'/g, '"');
				locatorText = "$x('"+enteredText+"')";
				break;
			default:
		      	alert("case not handled yet");	
		}
        
        return locatorText;
    }
    
	function evaluateContentScript(evaluationText, findEvent){
		if($scope.selection === "Id" && !findEvent)
			evaluationText = evaluationText.replace("inspect(", "").replace(")","");

		//console.log(evaluationText);

		chrome.devtools.inspectedWindow.eval(
		    evaluationText,
		    function(result, isException) {
		    	//console.log(result);
		    	// When find button is clicked don't display matching elements
				if (isException || result == null || result == undefined || result == "0")
				{
					$scope.message = "No element found";
                    $scope.resultCount = 0;
					//console.log("exception encountered");
				    //console.log(isException.isError +"<>"+ isException.code +"<>"+ isException.description +"<>"+ isException.details +"<>"+ isException.isException +"<>"+ isException.value +"<>");
				}
				else if($scope.selection == "Id" && !findEvent)
				{
					if(typeof result === "object"){
						$scope.message = "1 element found";
                        $scope.resultCount = 1;                        
					}						
				}
				else
				{	
					if(!isNaN(result) && !findEvent)
					{						
						var elementText = parseInt(result) > 1? " elements":" element";           			
						$scope.message = result + elementText +" found";
                        $scope.resultCount = parseInt(result);                        
					}
				}
                
                if($scope.resultCount > 0){
                    $scope.resultElements = fetchMatchingElements();
                    //fetchMatchingElements();
                }
                else{
                    $scope.resultElements = [];
                }
				$scope.$apply();				
			}
     	);
	};
    
    function fetchMatchingElements(){
        var locatorType = $scope.selection.replace(/ /g, "").toUpperCase();
        
        var resultElements = [];
        
        var elementLocator = generateDOMQueryString(locatorType, $scope.userEntry);
        
        if(locatorType === "ID"){
            
            chrome.devtools.inspectedWindow.eval(elementLocator+".outerHTML.replace("+elementLocator+".innerHTML,'')", { useContentScriptContext: true }, function(result, isException){
                if(isException){
                     //console.log("Issue occured while getting result element(s)" );
                     //console.log(isException.isError +"<>"+ isException.code +"<>"+ isException.description +"<>"+ isException.details +"<>"+ isException.isException +"<>"+ isException.value +"<>");
                 }
                 else{
                     resultElements.push(result);
                     //$scope.resultElements.push(result);
                     //console.log(result);
                 }
            });
            
        }
        else{
            // Iterate over all matching elements
            for ( var i = 0 ; i < $scope.resultCount ; i++ ){
                //console.log(elementLocator +"[" + i +"].outerHTML.replace("+ elementLocator+ "["+ i+"].innerHTML, '')");
                chrome.devtools.inspectedWindow.eval(elementLocator +"[" + i +"].outerHTML.replace("+ elementLocator+ "["+ i+"].innerHTML, '')", { useContentScriptContext: true }, function(result, isException){
                     if(isException){
                         //console.log("Issue occured while getting result element(s)" );
                         //console.log(isException.isError +"<>"+ isException.code +"<>"+ isException.description +"<>"+ isException.details +"<>"+ isException.isException +"<>"+ isException.value +"<>");
                     }
                     else{
                         resultElements.push(result);
                         //$scope.resultElements.push(result);
                         //console.log(result);
                     }
                 });
            }
        }
        return resultElements;
    };
    
    
}]);