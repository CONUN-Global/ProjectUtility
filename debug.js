var fs = require('fs');
var ipfsClient = require('ipfs-http-client');
var ipfs = new ipfsClient('http://15.164.230.100:5001');



async function downloadipfs(){


    const cid = 'QmX3UNKpEB8P2kQotjkXa3vykJUNLJxUiBPG81CTakMytA'
    const cid_taskinfo = 'QmdnQVX5BqDucZrJXf6pUThMdhocMSJkVfcsV377G5PXz1';
    const cid_core = 'QmZAZLbrmKGRtVXZGNqyWjd7BL5HSvHHuSavAcajzWKL9K';


    var hashlist = [
        "QmfGptfqdy3eFZo4KSpECBciKh1Arzb8kNSXFFkQqCR5eg",
        "Qmb5NiVuBZUTdte4WbmKwgSeTSeS9CFfw795PcpTudcF6t",
        "QmXH9yZV2JntcUa9WTfgT9S8GS6GvxySB4yyRpbsXzNDrY",
        "Qmdqbxq6xQrH3nYQsk6nNYNaFcBC9jT3MsXRGaacx8UkVj",
        ""
    ];
    for (var i = 0; i < hashlist.length; i++) {
        const chunks_core = [];
        const chunks = [];
        for await (const chunk of ipfs.cat(hashlist[i])) {
            chunks_core.push(chunk)
        }
       // updateTaskinfo("./core-process_1.exe", Buffer.concat(chunks_core))
        var filename = "file_" + i;
        //console.log(i + " num: ", Buffer.concat(chunks_core));
        fs.writeFileSync(filename, Buffer.concat(chunks_core));
    }

    // for await (const chunk1 of ipfs.cat(cid)) {
    //     chunks.push(chunk1)
    // }
    // updateTaskinfo("./task_1.exe", Buffer.concat(chunks))

    // for await (const chunk1 of ipfs.cat(cid_taskinfo)) {
    //     chunks.push(chunk1)
    // }
    // updateTaskinfo("./taskinfo.txt", Buffer.concat(chunks))
    // // console.log(Buffer.concat(chunks))

    //  console.log('cat file contents:')

//    var fileBuffer = await ipfs.cat(cid)
//    updateTaskinfo("./bbbb.exe", Buffer.concat(fileBuffer));//Buffer.concat(chunks)) //console.log('main file contents:', fileBuffer)

}

downloadipfs();