var express = require( 'express' );
var fs = require( 'fs' );
var multer = require( 'multer' ); 
var path = require( 'path' );
var sizeof = require( 'image-size' );
var uuid = require( 'uuid' );

// Constants
var EXTERNAL_PATH = 'uploads';
var IMAGE_TYPE = 'Content-Type';
var IMAGE_JPEG = 'image/jpeg';
var IMAGE_PNG = 'image/png';
var INTERNAL_PATH = '../public/uploads';
var UPLOAD_FIELD = 'attachment';
var UPLOAD_PATH = 'public/uploads';

var router = express.Router();

// Custom naming for file uploads
var storage = multer.diskStorage( {
	destination: UPLOAD_PATH,
	filename: function( req, file, cb ) {
		var extension = null;
		var name = null;
	  	var start = null;
		
		start = file.originalname.lastIndexOf( '.' );
		extension = file.originalname.substring( start, file.originalname.length );
		
		name = uuid.v4();
		name = name.replace( /-/g, '' );
		  
    	cb( null, name + extension );
	}
} );

// Handle file uploads
var upload = multer( {
	storage: storage	
} );

// Get list of file uploads
router.get( '/attachment', function( req, res ) {
	fs.readdir( path.join( __dirname, INTERNAL_PATH ), function( error, files ) {
		var dimensions = null;
		var list = null;
		var name = null;
		
		list = [];
		
		for( var f = 0; f < files.length; f++ )
		{
			name = path.join( __dirname, INTERNAL_PATH, files[f] );
			
			// Not a directory
			if( !fs.statSync( name ).isDirectory() )
			{
				// Not a dot file
				if( files[f].indexOf( '.' ) > 0 )
				{
					dimensions = sizeof( name );
					list.push( {
						height: dimensions.height,
						name: files[f],
						width: dimensions.width
					} );					
				} 
			}
		}
		
		res.json( {
			files: list,
			full: '/' + EXTERNAL_PATH + '/',
			path: EXTERNAL_PATH	
		} );
	} );
} );

// Get a specific file by ID
// Alternatively get attachment from database
router.get( '/attachment/:id', function( req, res ) {	
	// Look for matching file in uploads
	// Do not assume file extension
	fs.readdir( path.join( __dirname, INTERNAL_PATH ), function( error, files ) {
		var found = false;
		
		for( var f = 0; f < files.length; f++ )
		{
			// Found matching file
			if( files[f].indexOf( req.params.id ) == 0 )
			{
				found = true;
				break;
			}
		} 
		
		// May not be a matching file
		// Check database if not local
		if( !found )
		{
			// Assume ID is for document
			req.data.get( req.params.id, function( error, body ) {
				var attachment = null;
				var content = null;
				
				if( error )
				{
					req.logger.info( 'Problem reading document.' );
					req.logger.info( 'Message: ' + error.message );												
				}								
				
				// File attachment name
				attachment = Object.keys( body._attachments )[0];
				
				// Content type
				if( attachment.indexOf( 'jpg' ) ) 
				{
					content = IMAGE_JPEG;		
				} else {
					content = IMAGE_PNG;
				}
				
				// Get attachment
				req.data.attachment.get( req.params.id, attachment, function( error, body ) {
					if( error )
					{
						req.logger.info( 'Problem getting attachment.' );
						req.logger.info( 'Message: ' + error.message );
					}
					
					// Set content type
					// Write file to client
					res.set( IMAGE_TYPE, content  );
					res.send( body );
				} );			
			} );			
		} else {
			res.sendFile( path.join( __dirname, INTERNAL_PATH, files[f] ) );			
		}		
	} );
} );

// Upload a file
// Upload directory must already exist
// Return details on accessing image upload
router.post( '/attachment', upload.single( UPLOAD_FIELD ), function( req, res ) {
	var end = null;
	var id = null;
	
	end = req.file.filename.indexOf( '.' );
	id = req.file.filename.substring( 0, end )
	
	req.logger.info( 'Upload: ' + id );
	
	res.json( {
		file: req.file.filename,
		full: '/' + EXTERNAL_PATH + '/' + req.file.filename,
		id: id,
		path: EXTERNAL_PATH
	} );	
} );

// Remove a file by ID
// ID is file name without extension
router.delete( '/attachment/:id', function( req, res ) {
	fs.readdir( path.join( __dirname, INTERNAL_PATH ), function( error, files ) {
		var found = false;
		
		for( var f = 0; f < files.length; f++ )
		{
			// Found matching file
			if( files[f].indexOf( req.params.id ) == 0 )
			{
				found = true;
				break;
			}
		} 
		
		// May not be a matching file
		// Send error message or file
		if( !found )
		{
			res.send( '404: File not found.' );
		} else {
			fs.unlink( path.join( __dirname, INTERNAL_PATH, files[f] ), function() {
				res.send( 'Done.' );	
			} );		
		}		
	} );	
} );

module.exports = router;
