/* eslint-disable */
const path = require( "path" );
const fs = require( "fs/promises" );
const Jimp = require( "jimp" );
const config = require( "config" );
const ROOT_PATH = path.resolve( config.get( "gallery" ).root_fs_path );

const initGallery = async ( galleryName = [] ) =>
{

    const tester = /^.+\.(jpe?g|JPE?G)$/;
    const gPath = path.resolve( ROOT_PATH, galleryName );
    if( !( await fs.stat( gPath ) ) ) throw new Error( `Gallery ${galleryName} not found.` );
    const files = ( await fs.readdir( gPath ) ).filter( filename => tester.test( filename ) );
    const out = files.map( filename =>
    {
        return {
            gallery : galleryName,
            filename : filename,
            thumbnail : `tn/tn_${filename}`,
            title : "",
            description : ""
        }
    } );
    const indexPath = path.resolve( gPath, 'index.json' );
    let galleryIndex = [];
    try
    {
        galleryIndex = JSON.parse( await fs.readFile( indexPath, "utf-8" ) );
        galleryIndex = galleryIndex.filter( oldImage => out.find( image => image.filename === oldImage.filename ) );
    }
    catch( e )
    {
        // do nothing
    }
    try
    {
        await fs.mkdir( path.resolve( gPath, "tn" ) );
    }
    catch( e )
    {
        if( e.code !== 'EEXIST' ) console.error( e );
    }
    for( const image of out )
    {
        try
        {
            const stats = await fs.stat( path.resolve( ROOT_PATH, image.gallery, image.filename ) );
            image.ctime = stats.ctime;
            image.mtime = stats.mtime;
            image.birthtime = stats.birthtime;
            const img = await Jimp.read( path.resolve( ROOT_PATH, image.gallery, image.filename ) );
            await img.resize( 400, Jimp.AUTO ).write( path.resolve( ROOT_PATH, image.gallery, image.thumbnail ) );
            console.info( `Created thumbnail: ${image.thumbnail}` );
        }
        catch( e )
        {
            console.error( e );
        }
        if( !galleryIndex.find( item => item.filename === image.filename ) )
        {
            galleryIndex.push( image );
        }
    }
    await fs.writeFile( indexPath, JSON.stringify( galleryIndex, undefined, 2 ) );
    return galleryIndex;
};
module.exports = initGallery;