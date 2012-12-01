Safebox
=======

Safebox is a utility for saving/updating and deleting files from a directory, but safely.

The class accepts an array of valid extensions which it then uses to enforce access to files within the directory.

Example:

<pre>
	var safebox = require("safebox");
	var mgrResources = new safebox("/Users/Jimib/Desktop/", {validExtensions : [".txt"]});
	
	mgrResources.addResource("hello.txt", "hello world", function(err, resourceName){
		//check if we were successful writing to the directory
		console.log("Result: ", err, resourceName);
		//output: 'Result: undefined hello.txt'
	});
</pre>

If we try to write to a resource with an invalid exception we are blocked

<pre>
	var mgrResources = new safebox("/Users/Jimib/Desktop/", {validExtensions : [".txt"]});
	mgrResources.addResource("hello.csv", "hello world", function(err, resourceName){
		//check if we were successful writing to the directory
		console.log("Result: ", err, resourceName);
		//output: 'Result: Error:  Unable to add resource as has an invalid extension '.csv' hello.txt'
	});
</pre> 

Safebox makes it easy to add files to a directory without concern as to overwriting a previous file that happens to have the same name

<pre>
	var mgrResources = new safebox("/Users/Jimib/Desktop/", {validExtensions : [".txt"]});
	mgrResources.addResource("hello.txt", "hello world", function(err, resourceName){
		//check if we were successful writing to the directory
		console.log("Result: ", err, resourceName);
		//output: 'Result: undefined hello.txt'
		//try and write over the file
		mgrResources.addResource("hello.txt", "hello world", function(err, resourceName){
			//check if we were successful writing to the directory
			console.log("Result: ", err, resourceName);
			//output: 'Result: undefined hello(1).txt'
		});
	});
</pre>

Note: Although we specified the resourceName was 'hello.txt', a resource by the same name already exists which is invalid, the resourceName was automatically incremented for us to 'hello(1).txt'

If we did want to update a file we can use the alternative method 'updateResource', but this enforces the policy that the resource must exist before we can update it

If we want a list of all resource within a directory we can use 'getAllResources'

<pre>
	mgrResources.getAllResources(function(err, resources){
		console.log("Resources: ", resources);
	});
</pre>
