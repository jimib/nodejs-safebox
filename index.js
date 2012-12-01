Array.prototype.forEachAsync = function(action, cb){
	var self = this;
	var i = - 1;
	var lim = this.length;
	
	next();
	
	function next(){
		if(++i < lim){
			action(self[i], function(err, result){
				self[i] = result || self[i];
				next();
			});
		}else{
			cb();
		}
	}
}

var fs = require("fs");
var path = require("path");
var util = require("util");

Safebox = module.exports = function(dir, options){
	var self = this;
	
	this.dir = dir;
	this.options = options || this.defaultOptions;
	
	var err = null;
	//check the dir exists
	try {
	    // Query the entry
	    var stats = fs.lstatSync(this.dir);

	    // Is it a directory?
	    if (!stats.isDirectory()) {
	        //THIS SHOULD BE A DIRECTORY
			err = "Safebox dir '"+this.dir+"' should be a directory"
	    }
	}
	catch (e) {
		err = e.message;
	}
	
	if(err)throw new Error(err);
}

Safebox.sortAtoZ = function(resources){
	resources.sort(function(a, b){
		return a.name < b.name ? 1 : -1;
	});
}

Safebox.sortZtoA = function(resources){
	resources.sort(function(a, b){
		return a.name > b.name ? 1 : -1;
	});
}

Safebox.prototype = {
	defaultOptions : {
		validExtensions : [".jpeg"]
	},
	getValidExtensions : function(){return this.options.validExtensions || this.defaultOptions.validExtensions;},
	getAllResources : function(cb){
		var self = this;
		//get all the contents of the resource directory
		fs.readdir(this.dir, function(err, resources){
			var output = [];
			resources = resources || [];
			//convert to a resources object
			var validExtensions = self.getValidExtensions();
			resources.forEach(function(resourceName){
				if(hasValidExtension(resourceName, validExtensions)){
					output.push(new Resource(self.getPathToResource(resourceName)));
				}
			});
			//sort the resources
			
			//return the list
			cb(err, output);
		});
	},
	loadResourcesContents : function(resources, cb){
		//load up the resources
		resources = resources || [];
		var isArray = Array.isArray(resources);
		resources = isArray ? resources : [resources];
	
		//load each in turn
		resources.forEachAsync(function(resource, cb){
			fs.readFile(resource.path, function(err, content){
				resource.content = content;
				cb();
			});
		}, function(){
			cb(null, resources);
		});
		
	},
	loadResourcesStats : function(resources, cb){
		var self = this;
		//load up the resources
		resources = resources || [];
		var isArray = Array.isArray(resources);
		resources = isArray ? resources : [resources];
	
		//load each in turn
		resources.forEachAsync(function(resource, cb){
			fs.lstat(resource.path, function(err, stat){
				resource.stat = stat;
				cb();
			});
		}, function(){
			cb(null, resources);
		});
	},
	_validateActionOnResource : function(resourceName, action, cb){
		var self = this;
		//check that the file has a valid extension before we save it
		if(!hasValidExtension(resourceName, self.getValidExtensions())){
			cb("Unable to "+action+" as has an invalid extension '"+path.extname(resourceName)+"'", false);
		}else{
			cb(null, true);
		}
	},
	getPathToResource : function(resourceName){
		return path.join(this.dir, resourceName);
	},
	_copyContentsToResource  : function(resourceName, pathSrc, cb){
		var self = this;
		var streamIn = fs.createReadStream(pathSrc);
		var streamOut = fs.createWriteStream(_self.getPathToResource(resourceName));
		
		//pump the contents using util pump
		util.pump(streamIn, streamOut, cb);
	},
	_writeContentsToResource  : function(resourceName, data, cb){
		fs.writeFile(this.getPathToResource(resourceName), data, cb);
	},
	_isCurrentResource : function(resourceName, action, cb){
		fs.exists(this.getPathToResource(resourceName), function(exists){
			cb(exists ? null : "Unable to '"+action+"', resource '"+resourceName+"' does not exist");
		});
	},
	addResource : function(resourceName, data, cb){
		var self = this;
		
		self._validateActionOnResource(resourceName, "add resource", function(err, valid){
			if(!valid){
				cb(err);
			}else{
				//slight split - we could be writing data or a file pumping a file
				self.getUniqueResourceName(resourceName, function(err, resourceName){
					//write the contents to the file
					if(data.path){
						//copy the file contents
						self._copyContentsToResource(resourceName, data.path, function(err){
							cb(err, resourceName);
						});
					}else{
						//write the contents
						self._writeContentsToResource(resourceName, data, function(err){
							cb(err, resourceName);
						});
					}
				});
			}
			
		});
		
	},
	updateResource : function(resourceName, data, cb){
		var self = this;
		var action = "update resource";
		self._validateActionOnResource(resourceName, action, function(err, valid){
			if(!valid){
				cb(err);
			}else{
				//ensure the resource exists
				self._isCurrentResource(resourceName, action, function(err){
					if(err){
						cb(err);
					}else if(data.path){
						//copy the file contents
						self._copyContentsToResource(resourceName, data.path, function(err){		
							cb(err);
						});
					}else{
						//write the contents
						self._writeContentsToResource(resourceName, data, function(err){
							cb(err);
						});
					}
				});
			}
		});
	},
	removeResource : function(resourceName, cb){
		//remove the named resource
		var action = "remove resource";
		var self = this;
		self._validateActionOnResource(resourceName, action, function(err, valid){
			if(!valid){
				cb(err);
			}else{
				self._isCurrentResource(resourceName, action, function(err){
					if(err){
						cb(err);
					}else{
						//update the resource
						fs.unlink(self.getPathToResource(resourceName), cb);
					}
				});
			}
		});
	},
	getUniqueResourceName : function(resourceName, cb){
		var self = this;
		cb = typeof cb == 'function' ? cb : function(err, resourceName){};
		var regNum = /\(([0-9]+)\)/;
		var index = -1;
		var result;
		//get the result
		function extractCoreName(value){
			value = path.basename(value, path.extname(value));
			//if is name 'image(1)' it will reduce down to 'image'
			if(result = regNum.exec(value)){
				//index = Number(result[1]);
				value = value.substr(0, result.index);
			}
			
			return value;
		}
		
		function getIndex(value){
			if(result = regNum.exec(value)){
				return Number(result[1]);
			}
			return null;
		}
		
		resourceName = extractCoreName(resourceName) + path.extname(resourceName)
		//create a resource for comparison
		var resourceNew = new Resource(resourceName);
		
		
		//check the current resourcenames and ensure that this one is unique - return the next valid name
		self.getAllResources(function(err, resources){
			//check each name - if conflict
			resources.forEach(function(resource){
				if(resource.ext == resourceNew.ext){
					//potential clash
					if(extractCoreName(resource.basename) == resourceNew.basename){
						//clash
						index = Math.max(index, getIndex(resource.basename) + 1);
					}
				}
			});
			
			//confirm the new name
			resourceName = resourceNew.basename + (index > -1 ? "("+index+")" : "") + resourceNew.ext;
			cb(null, resourceName); 
		});
		
		
	}
}

Resource = function(pathFile){
	return {
		path : pathFile, 
		dir : path.dirname(pathFile),
		name : path.basename(pathFile),
		basename : path.basename(pathFile, path.extname(pathFile)),
		ext : path.extname(pathFile)	
	}	
}

function hasValidExtension(pathFile, exts){
	exts = exts || [];
	//check the extension of the path against the array of valid extensions
	return exts.indexOf(path.extname(pathFile)) > -1 ? true : false;
}