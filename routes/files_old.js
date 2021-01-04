var express = require('express');
var router = express.Router();
var validator = require('validator');
var fs = require('fs');
var path = require('path');
var multer = require('multer');
var ipfsClient = require('ipfs-http-client');
var ipfs = new ipfsClient('http://15.164.230.100:5001');

// storage & rename
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    var uniqueSuffix = 'task_' + Date.now() + '_' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '_' + file.originalname);
  }
});
// ext 필터.
var fileFilter = function (req, file, cb) {
  var fileExt = ['.txt', '.json', '.css', '.js','.exe'];
  //debug(file)
  if (file) {
    var ext = path.extname(file.originalname).toLowerCase();
    if (validator.isIn(ext, fileExt)) {
      cb(null, true);
    } else {
      cb(new Error("Upload Files - Format Error"));
    }
  }
};
var upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 10 // 10MB까지만
  }
});

var formidable = require("formidable");
var util = require('util');

// 라우터 처리 /json ~ 블라블라 /json/store
router.get('/', function(req, res, next) {
  res.sendFile(__dirname + '/form.html'); // 파일호출을 위하 정확한 경로지정 필수
});

router.post('/store', upload.array('task_file'), async function (req, res, next) {
  //console.log(req.files);

  var obj = {
    msgtype: req.body.msg_type,
    cmd_tag: req.body.cmd_tag,
    guid: req.body.guid = 'aaaaaaaaaa',
  };

  obj.task_info = {
    taskName: obj.guid,
    taskcount: 0,
    tasknamelist: []
  };

  var files = req.files;
  console.log(files);


  if (Array.isArray(files)) {
    for (var i = 0; i < files.length; i++) {
      var orgName = files[i].originalname;
      var split = orgName.split('_');
      var prefix = split[0]; // 프로세스, doc, info 접두사 구분
      var os = split[1]; // os 구분
      var pid = split[2]; // 프로젝트명
      var tid = split[3]; // task 명
      var added, os_hash;


      var jsonData = {
          node_guid: 'node',
          sub_task_id: 1 + i,
          process_name: tid,
          status: 'NONE',
          value: 500,
          os: [],
          para_info_loca: "QmXBCk7TgPtajpxQFmHJvxiv56T3mdMbaR4JhJpaLqkFqh",
          para_CRC: "0x12345678",
          data_loca: "Qma3wcYW8b3x2KP3LPBMCeqTFDrFS2mcjBUvqUNMAE6s5r",
          data_CRC: "0x12345678",
          cre_date: "2020-02-11 15:20:30",
          time_unit: "m",
          work_time: 20
        //node_guid: added.cid.string,
      };

      // 프로세스정보 검출
      console.log(os);
      if (prefix=='P') {
        if ( os.toUpperCase() == "WIN" || os.toUpperCase() == "MAC" || os.toUpperCase() == "LINUX" ) {
          //return true;
          added = await ipfs.add(files[i].path);
          os_hash = added.cid.string;
          var osData = {
            task_resource: os,
            process_loca: os_hash,
            process_CRC: 'crc',
          };
          jsonData.os.push(osData);
        }
      };

      obj.task_info.tasknamelist.push(jsonData);

      fs.unlinkSync(files[i].path);
    }// for
  }else{
    var added = await ipfs.add(files.path);
    var jsonData = {
      sub_task_id: 1,
      node_guid: 'node',
      node_guid: added.cid.string,
      value: 500,
    };
    obj.task_info.tasknamelist.push(jsonData);
    fs.unlinkSync(files.path);
  }

  //console.dir( obj );


  var filename = req.body.proj_name + '_project.txt';
  var mimetype = 'application/json';
  res.setHeader('Content-Type', mimetype);
  res.setHeader('Content-disposition','attachment; filename='+filename);
  res.send( obj );

});
module.exports = router;
