const removeRelativePathFromUrl = url => url.replace(/^.+\.\//, '').replace('./', '');

/* Dynamic linking is not supported. */

const regex = new RegExp(/__\$\w+\$__/,'g');
const address = '0000000000000000000000000000000000000000';
const replaceLinkedLibs = byteCode => byteCode.replace(regex, address);

module.exports = {
    removeRelativePathFromUrl,
    replaceLinkedLibs
};
