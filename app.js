var execFile = require('child_process').execFile,
    exec = require('child_process').exec,
    fs = require('fs'),
	colors = require('colors'),
	winston = require('winston');

var opts = require('optimist')
        .usage('Usage: $0')
        .options({
                help: {
                        demand: false,
                        alias: 'h',
                        description: 'Show this help'
                },
                debug: {
                        demand: false,
                        alias: 'd',
                        description: 'debug',
                        default: false
                },
                port: {
                        demand: true,
                        alias: 'p',
                        description: 'port',
                        default: process.env.PORT || 8080,
                }
        }).argv;
  ; 
 // Show help if asked
if (opts.help) {
    optimist.showHelp();
    process.exit(0);
} 
  
// http://fideloper.com/node-github-autodeploy
// https://github.com/danheberden/gith	
// https://github.com/G33kLabs/g33k-webhooks/blob/master/src/app.js

var GithServer = function(){	
    var logger = new (winston.Logger)({
        transports : [new (winston.transports.Console)({
             json : false,
             timestamp : true,
	         colorize: true,
	         level: 'info' 
        })
        ]
        ,exitOnError : false
        ,exceptionHandlers : [new (winston.transports.Console)({
             json : false,
             timestamp : true,
	         colorize: true
        }), new winston.transports.File({
             filename : __dirname + '/exceptions.log',
             json : false
        })] 
    });
	
	var conf ;
	var gith ;
	
	
    function scanConfig(){
        var repos = conf.repos;
        for(var i=0;i<repos.length;i++){
		    try{
	            //logger.info(repos[i].git,repos[i].repo,repos[i].oldname,repos[i].name,repos[i].root);
			}catch(e){
		        logger.log("warm",'configuration file not valid');
			    process.exit(1);			    
			}
		    var path = __dirname+"/enabled/"+ repos[i].name+".sh";		
		    //logger.info('path   '+path+"   ");
			
		    var code = createLinuxSh(repos[i].git,repos[i].repo,repos[i].oldname, repos[i].name,repos[i].root);
			checkEachConfig(path,code);	
	    }
    }
	
	function checkEachConfig(script_path,code){
	        fs.exists(script_path, function (exists) {
                if(exists){
		            logger.info('file exists:'.green,script_path);		
		        }else{
		            logger.log("warm",'file do not exist'.red, script_path );
                
			        fs.writeFile(script_path, code, function(err) {
                            if(err) {
                            logger.error(err);						
                        } else {
                            logger.info("The file was saved!");
                            fs.chmodSync(script_path, '777');

                            exec("chmod +x " + script_path, function(err, stdout, stderr) {
                                //logger.info(stdout);	
                            });  							
                        }
                    }); 		            
		        }	
	        })		
	}

    function createLinuxSh(git,repo,oldname,name,root){
        var code ;
	    code = 'echo "stop the current application"' +"\n"
	        + 'forever stop '+root+''+name+'/app.js'+"\n"
            + 'echo "download the git"'	+"\n"		
	        + 'git clone '+git +"\n"
			+ 'echo "remove the previous repository"' +"\n"
			+ 'rm -rf '+root+''+name +"\n"
			+ 'echo "replace the latest repository"' +"\n"
			+ 'mv  '+oldname+'  '+name +"\n"
			+ 'mv '+name+'  '+ root +"\n"
			+ 'echo "installing npm dependencies"' +"\n"
			+ 'cd '+root+''+name +"\n"
			+ '#npm install' +"\n"
			+ 'echo "restart the current application"' +"\n"
			+ 'NODE_ENV=production forever start '+root+''+name+'/app.js'  ;
	    return code;
    }
	
	function startServer(port){	
	    try{
            conf = require('./conf');
		}catch(e){
		    logger.warm('configuration file not found');
			process.exit(1);
		}
        if(port == undefined || port == null)  port = 8080;
        		
	    scanConfig();
	    gith = require('gith').create( port );	    
        var repos = conf.repos;
        for(var i=0;i<repos.length;i++){
		    try{
	            //logger.info(repos[i].git,repos[i].repo,repos[i].oldname,repos[i].name,repos[i].root);
				startGitServer(repos[i].repo,repos[i].name);	
				
				// var path = __dirname+"/enabled/"+ repos[i].name+".sh";  executeUpdate(path);
				
			}catch(e){
		        logger.warm('configuration file not valid');
			    process.exit(1);			    
			}            					
	    }		
	}
	
	function stopServer(){
	    if(gith)
	    gith.close();
	}
	
	function startGitServer(repo,name){
		gith({
            repo: repo
        }).on( 'all', function( payload ) {
            if( payload.branch === 'master' )
            {
                //console.log('all',payload ); 
                // Exec a shell script
		        console.log(__dirname+'/enabled/'+name+'.sh');
                execFile(__dirname+'/enabled/'+name+'.sh', function(error, stdout, stderr) {
                    // Log success in some manner
			        if(error) console.log("error",error);
			        else console.log( 'exec complete',stdout );
                });	
                //exec('bash -x /path/install.sh', function (error, stdout, stderr) {});				
            }
        }).on( 'file:add', function( payload ) {
            if( payload.branch === 'master' )
            {
                console.log( 'these files were added', payload.files.added, payload.time ); 
            }
        }).on( 'file:modify', function( payload ) {
            if( payload.branch === 'master' )
            {
                 console.log( 'these files were modifyed', payload.files.modified, payload.time );
            }
        }).on( 'file:delete', function( payload ) {
             if( payload.branch === 'master' )
        {
              console.log( 'these files were deleted', payload.files.deleted, payload.time );
         }
        });	
	}

	function executeUpdate(script_path){
	    
	    var command = "sudo " + script_path;
		exec(command, function(err, stdout, stderr) {
      
        });
	}
	
    process.on('SIGINT', function() {
        winston.info("\nShutting down from  SIGINT");
        process.exit();
    });	
	
    this.startServer = startServer;
}

    

var server = new GithServer();
server.startServer(8080);




/*
var gith = require('gith').create( 8080 );
gith({
    repo: 'helxsz/sensorexample'
}).on( 'all', function( payload ) {
        // Debug payload
        winston.warn('[>] Post-commit happened on '+payload.repo+' !');
        //winston.info(JSON.stringify(payload, null, 4)); 

        // Set post-commit script path
        var postCommit = path.resolve('./repos/'+payload.repo+'/post-commit');

        // Find post-commit script and exec it
        async.series({

                // Search for post-commit script
                exists: function(next) {
                        fs.exists(postCommit, function(exists) {
                                next(!exists?'No post-commit found for '+postCommit:null);
                        });
                },

                // Run
                execute: function(next) {
                        winston.info('[>] Launch post-commit : '+postCommit+'...'); 
                        var post_commit = spawn('/bin/sh', [postCommit]); 

                        // Pipe logs
                        post_commit.stdout.setEncoding('utf8');
                        post_commit.stderr.setEncoding('utf8');
                        post_commit.stdout.on('data', winston.debug);
                        post_commit.stderr.on('data', winston.debug);

                        // On close
                        post_commit.on('close', function (code) {
                                console.log('child process exited with code ' + code);
                                next(); 
                        });        
                }
        },

        // Response
        function(err, success) {
                if ( err ) {
                        winston.error(err);
                }
                else {
                        winston.info('post-commit script exists for '+payload.repo); 
                }
        });
});

*/