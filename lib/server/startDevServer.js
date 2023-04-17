/* eslint-disable */
const express = require( "express" );
const cors = require( "cors" );
const path = require( "path" );
const fs = require( "fs/promises" );
const config = require( "config" );
const initGallery = require( "./initGallery" );
const port = config.get( "server" ).port;
const ROOT_PATH = path.resolve( config.get( "gallery" ).root_fs_path );
const fileExists = async filePath =>
{
    try
    {
        await fs.access( filePath );
        return true;
    }
    catch( e )
    {
        return false;
    }
}
module.exports = function startDevServer()
{
    const app = express();
    app.use( express.json() );
    app.use( cors() );
    app.get( "/liveness", ( req, res ) =>
    {
        res.send( { result : "success" } );
    } );
    app.post( '/update', async ( req, res ) =>
    {
        try
        {
            await fs.writeFile( path.resolve( ROOT_PATH, req.body.galleryName, "index.json" ), JSON.stringify( req.body.galleryIndex, undefined, 2 ) );
            res.send( { result : "success" } );
        }
        catch( e )
        {
            console.error( e );
            res.send( { result : "error" } );
        }
    } );
    app.post( '/update-index', async ( req, res ) =>
    {
        try
        {
            await fs.writeFile( path.resolve( ROOT_PATH, "index.json" ), JSON.stringify( req.body, undefined, 2 ) );
            res.send( { result : "success" } );
        }
        catch( e )
        {
            console.error( e );
            res.send( { result : "error" } );
        }
    } );
    app.post( '/initialize', async ( req, res ) =>
    {
        try
        {
            res.send( { result : "success", gallery : await initGallery( req.body.galleryName ) } );
        }
        catch( e )
        {
            console.error( e );
            res.send( { result : "error" } );
        }
    } );
    app.get( '/galleries', async ( req, res ) =>
    {
        const out = [];
        try
        {
            const dirs = await fs.readdir( ROOT_PATH );
            for( const dir of dirs )
            {
                const galleryPath = path.resolve( ROOT_PATH, dir );
                if( ( await fs.stat( galleryPath ) ).isDirectory() )
                {
                    const files = await fs.readdir( galleryPath );
                    const galleryInfo = {
                        id : dir,
                        name : dir,
                        description : "",
                        initialized : false,
                    };
                    const indexPath = path.resolve( galleryPath, "index.json" );
                    if( files.includes( "index.json" ) )
                    {
                        galleryInfo.initialized = true;
                        const info = JSON.parse( await fs.readFile( indexPath, { encoding : "utf-8" } ) );
                        let clean = true;
                        for( const image of info )
                        {
                            if( !files.includes( image.filename ) )
                            {
                                clean = false;
                                break;
                            }
                        }
                        for( const file of files.filter( file => file.toLowerCase().includes( '.jpeg' ) ) )
                        {
                            if( !clean || !info.find( image => image.filename === file ) )
                            {
                                clean = false;
                                break;
                            }
                        }
                        galleryInfo.clean = clean;
                    }
                    out.push( galleryInfo )
                }
            }
            const result = { result : "success", galleries : out };
            if( await fileExists( path.resolve( ROOT_PATH, "index.json" ) ) )
            {
                const galleries = JSON.parse( await fs.readFile( path.resolve( ROOT_PATH, "index.json" ), { encoding : "utf-8" } ) );
                for( const gallery of galleries )
                {
                    const outGallery = out.find( gall => gall.id === gallery.id );
                    if( outGallery )
                    {
                        outGallery.name = gallery.name;
                        outGallery.description = gallery.description;
                        outGallery.titleImage = gallery.titleImage;
                        outGallery.size = gallery.size;
                    }
                }
                out.sort( ( a, b ) => {
                    return galleries.findIndex( gall => gall.id === a.id ) - galleries.findIndex( gall => gall.id === b.id );
                } );
            }
            res.send( result );
        }
        catch( e )
        {
            console.error( e );
            res.send( { result : "error" } );
        }
    } );
    app.listen( port, () =>
    {
        console.log( `Gallery development app listening on port ${ port }` )
    } )
}
