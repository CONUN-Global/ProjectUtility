var express = require('express');
var router = express.Router();
var validator = require('validator');
//var sleep = require('sleep');
var fs = require('fs-extra');
var path = require('path');
var multer = require('multer');
require('date-utils');
var async = require('async')
var ipfsClient = require('ipfs-http-client');
var ipfs_ip;
var ipfs_port;
var full_address;
var ipfs;

var newDate = new Date();
var CurrentTime = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');

// storage & rename
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads');
    },
    filename: function (req, file, cb) {
        var uniqueSuffix = 'task_' + Date.now() + '_' + Math.round(Math.random() * 1E9);
        //cb(null, uniqueSuffix + '_' + file.originalname);
        cb(null, file.originalname);
    }
});
// ext 필터.
var fileFilter = function (req, file, cb) {
    var fileExt = ['.txt', '.json', '.css', '.js', '.exe', '.dll', '.dat', '.bin', ''];
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
const { getPackedSettings } = require('http2');


// 라우터 처리 /json ~ 블라블라 /json/store
router.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/form.html'); // 파일호출을 위하 정확한 경로지정 필수
});


router.post('/ing', function (req, res, next) {
    res.sendFile(__dirname + '/process.html'); // 파일호출을 위하 정확한 경로지정 필수
});

router.post('/complete', function (req, res, next) {
    res.sendFile(__dirname + '/complete.html'); // 파일호출을 위하 정확한 경로지정 필수
});

    var obj = {
        proj_ID:"", //req.body.proj_id, //examples from it will be insert menu.
        msgtype:"",
        cmd_tag:"",
        proj_sequ:"",
        proj_flag:"",
        proj_guid:"",
        proj_name:"",
        proj_type:"",
        proj_desc:"",
        st_date:"",
        en_date:"",
        credit:"",
        pay_type:"",
        total_task_num: 0,
        done_task_num: 0,
        core_ver:"",
        core_count: 0,
        Core_Process: []
    };

    obj.task_info = {
        task_ID:"1",
        sub_task_process_count:"", //폼에서 작성할수있도록한다
        task_process_mode: "1",
        task_cre_date:"",
        taskName:"",
        resource_mode:"",
        tasknamelist: []
    };

    // Data Server Config
    obj.data_server_info= {
        type:"",
        ip:"",
        port:"",
        id:"",
        pw:""
    };
    obj.result_data_server_info= {
        type:"",
        ip:"",
        port:"",
        id:"",
        pw:""
    };

    

router.post('/store', upload.array('task_file'), async function (req, res, next) {
    //console.log(req.files);

    // ipfs 함수사용을 위한 선언
    ipfs_ip = req.body.ip;
    ipfs_port = req.body.port;
    full_address = 'http://' + ipfs_ip + ":" + ipfs_port;


    var files = req.files;
    //console.log(files);
    var fileinfo = new Object();

    if (Array.isArray(files)) {
        //var Proj_ID = "10001"; //examples from it will be insert menu.
       
        obj.proj_ID = req.body.proj_id; //req.body.proj_id, //examples from it will be insert menu.
        obj.msgtype = req.body.msg_type;
        obj.cmd_tag = req.body.cmd_tag;
        obj.proj_sequ = parseInt(req.body.proj_sequ);
        obj.proj_flag = req.body.proj_flag;
        obj.proj_guid = req.body.proj_guid;
        obj.proj_name = req.body.proj_name;
        obj.proj_type = req.body.proj_type;
        obj.proj_desc = req.body.proj_desc;
        obj.st_date = req.body.st_date;
        obj.en_date = req.body.en_date;
        obj.credit = parseInt(req.body.credit);
        obj.pay_type = req.body.pay_type;
        obj.total_task_num = 0;
        obj.done_task_num = 0;
        obj.core_ver = req.body.core_ver;
        obj.core_count = 0;
        obj.Core_Process = [];



        obj.task_info.task_ID = "1";
        obj.task_info.sub_task_process_count = parseInt(req.body.stp_count); //폼에서 작성할수있도록한다
        obj.task_info.task_process_mode = "1";
        obj.task_info.task_cre_date = CurrentTime;
        obj.task_info.taskName = obj.guid;
        obj.task_info.resource_mode = req.body.resource_mode;
        obj.task_info.tasknamelist = [];


        // Data Server Config

        obj.data_server_info.type = req.body.type;
        obj.data_server_info.ip = req.body.ip;
        obj.data_server_info.port = req.body.port;
        obj.data_server_info.id = req.body.id;
        obj.data_server_info.pw = req.body.pw;

        obj.result_data_server_info.type = req.body.type;
        obj.result_data_server_info.ip = req.body.ip;
        obj.result_data_server_info.port = req.body.port;
        obj.result_data_server_info.id = req.body.id;
        obj.result_data_server_info.pw = req.body.pw;


        fileinfo.rootpath = ""; //__dirname; //upper(root) path for tasksfold
        fileinfo.coreinfo = {
            corelist: []
        };

        fileinfo.taskinfo = {
            tasklist: []
        };
        //console.log('info :', fileinfo);

        var dirName = 'uploads/';
        // 업로드 되는 파일수 반복처리
        for (var i = 0; i < files.length; i++) {

 
            var orgName = files[i].originalname;
            var filePath = dirName + orgName;

            //console.log('orgName :', orgName);

            // 구분자 처리
            var split = orgName.split("_");
            var pre_fix = split[0]; // Proccess, Doc, Info 제일 상위 접두어 구분처리

            // 상위 접두어
            if ((pre_fix == "P") || (pre_fix == "D") || (pre_fix == "I")) {

                var os_pfix = split[1]; // OS 구분
                var proj_pfix = split[2]; // 프로젝트 ID
                var taskid_pfix = split[3]; // task ID
                var subtaskid_pfix = split[4]; // sub task ID(count index)
                subtaskid_pfix = orgName; // 파일명 -> task_sub_접두어

                var item_info = {
                    sub_task_id:`${taskid_pfix}`,
                    sub_info:[],
                    D:[],
                    I:[]
                };
                var sub_info = {
                    OS_TYPE: `${os_pfix}`,
                    P: []
                };

                if (obj.proj_ID == proj_pfix) {

                    if (pre_fix == "P") { // Proccess
                        if ((os_pfix.toUpperCase() == "WIN") || (os_pfix.toUpperCase() == "MAC") || (os_pfix.toUpperCase() == "LINUX")) {

                            var val = fileinfo.taskinfo.tasklist.find(function (item) {
                                return item.sub_task_id == taskid_pfix;
                            });
                            if (val) {
                                var val1 = val.sub_info.find(function (item) {
                                    return item.OS_TYPE == os_pfix;
                                });
                                if (val1) {
                                    val1.P.push(filePath);
                                } else {
                                    sub_info.P.push(filePath);
                                    val.sub_info.push(sub_info);
                                }
                            } else {

                                sub_info.P.push(filePath);
                                item_info.sub_info.push(sub_info);
                                fileinfo.taskinfo.tasklist.push(item_info);
                            }
                        } else {
                            console.log("there is worng OS Prefix in tasks", orgName);
                        }

                    } else if (pre_fix == "D") { // Document
                        var val = fileinfo.taskinfo.tasklist.find(function (item) {
                            return item.sub_task_id == taskid_pfix;
                        });
                        if (val) {
                            val.D.push(filePath);
                        } else {
                            item_info.D.push(filePath);
                            fileinfo.taskinfo.tasklist.push(item_info);
                        }

                    } else if (pre_fix == "I") { // Information
                        var val = fileinfo.taskinfo.tasklist.find(function (item) {
                            return item.sub_task_id == taskid_pfix;
                        });
                        if (val) {
                            val.I.push(filePath);
                        } else {
                            item_info.I.push(filePath);
                            fileinfo.taskinfo.tasklist.push(item_info);
                        }
                    }

                } else {
                    console.log("there is worng Project Prefix in tasks", orgName);
                }

            } //최상의 접두어는 Core 의 구분
            else if (pre_fix == "C") {

                var os_pfix = split[1]; //os 구분
                var type_pfix = split[2]; //file type
                var proj_pfix = split[3]; //프로젝트 ID
                var name_pfix = split[4]; //name
                
                var item_info = {
                    OS_TYPE: `${os_pfix}`,
                    PROCESSOR: [],
                    DLL: [],
                    OTHER: []
                };


                if (obj.proj_ID == proj_pfix) {

                    if ((os_pfix.toUpperCase() == "WIN") || (os_pfix.toUpperCase() == "MAC") || (os_pfix.toUpperCase() == "LINUX")) {

                        if (type_pfix.toUpperCase() == "P") { // Proccess
                            var val = fileinfo.coreinfo.corelist.find(function (item) {
                                return item.OS_TYPE == os_pfix;
                            });
                            if (val) {
                                val.PROCESSOR.push(filePath);
                            } else {
                                item_info.PROCESSOR.push(filePath);
                                fileinfo.coreinfo.corelist.push(item_info);
                            }
                            //console.log("processo", fileinfo.coreinfo.corelist);


                        } else if (type_pfix.toUpperCase() == "D") { // DLL
                            var val = fileinfo.coreinfo.corelist.find(function (item) {
                                return item.OS_TYPE == os_pfix;
                            });
                            if (val) {
                                val.DLL.push(filePath);
                            } else {
                                item_info.DLL.push(filePath);
                                fileinfo.coreinfo.corelist.push(item_info);
                            }
                            //console.log("DLL ", fileinfo.coreinfo.corelist);


                        } else if (type_pfix.toUpperCase() == "O") { // Other
                            var val = fileinfo.coreinfo.corelist.find(function (item) {
                                return item.OS_TYPE == os_pfix;
                            });
                            if (val) {
                                val.OTHER.push(filePath);
                            } else {
                                item_info.OTHER.push(filePath);
                                fileinfo.coreinfo.corelist.push(item_info);
                            }
                           // console.log("other " , fileinfo.coreinfo.corelist);
                        } else {
                            console.log("there is worng type Prefix in tasks", orgName);
                        }

                    } else {
                        console.log("there is worng OS Prefix in tasks", orgName);
                    }

                } else {
                    console.log("there is worng Project Prefix in core", orgName);
                }
            } else {
                console.log("there is worng Prefix", orgName);
            }

        } //endfor 파일갯수만큼
        console.log("core info", fileinfo.coreinfo.corelist);
        task_test(obj, fileinfo, req, res)

//////////////////////////////////////////////////////////////////
//make project.json
//////////////////////////////////////////////////////////////////

        // var task_value = obj.credit / fileinfo.taskinfo.tasklist.length;

        // ipfs = ipfsClient(full_address);
        // var index = 0;
        // async.waterfall([

        //     function (callback) {
        //         if(fileinfo.coreinfo.corelist.length > 0){
        //             ipfsupload_core(ipfs, fileinfo, obj, index, callback); //
        //         }
        //         else{
        //             callback(null, index);
        //         }
        //     },
        //     function (arg1, callback) {
        //         console.log("second tasklist ", fileinfo.taskinfo.tasklist.length);
        //         index = 0;
        //         if (fileinfo.taskinfo.tasklist.length > 0) { 
        //             ipfsupload_task(ipfs, task_value, fileinfo, obj, index, function(res1){
        //                 console.log("1 end all process");
        //                 callback(null, index)
        //             });
        //         }
        //         else {
        //             callback(null, index);
        //         }
        //     }

        // ], function (err, result) {
        //     console.log("2 end all process", obj.task_info.tasknamelist.length, obj.task_info.tasknamelist);

        //     var filename = '';
        //     if (req.body.msg_type) {
        //         filename = req.body.proj_name + '_' + req.body.proj_id + '.json';
        //     } else {
        //         filename = 'untitle_project.json';
        //     }
        //     var mimetype = 'application/json';
        //     res.setHeader('Content-Type', mimetype);
        //     res.setHeader('Content-disposition', 'attachment; filename=' + filename);
        //     res.send(obj);
        // });


        // 업로드된 모든파일를 삭제한다
        // fs.unlink(filePath, (err) => {
        //     if (err) console.log(err);
        // });           
//////////////////////////////////////////////////////////////////////////////////////////////// 
    } // endif 업로드 파일존재 여부
});
module.exports = router;



/**
 * 사용자 정의 함수 시작
 * @param {*} obj 
 * @param {*} fileinfo 
 * @param {*} req 
 * @param {*} res 
 */
async function task_test(obj, fileinfo, req, res){
    var task_value = obj.credit / fileinfo.taskinfo.tasklist.length;

    ipfs = ipfsClient(full_address);
    var index = 0;
    async.waterfall([

        function (callback) {
            if(fileinfo.coreinfo.corelist.length > 0){
                ipfsupload_core(ipfs, fileinfo, obj, index, callback); //
            }
            else{
                callback(null, index);
            }
        },
        function (arg1, callback) {
            console.log("second tasklist ", fileinfo.taskinfo.tasklist.length);
            index = 0;
            if (fileinfo.taskinfo.tasklist.length > 0) { 
                ipfsupload_task(ipfs, task_value, fileinfo, obj, index, function(res1){
                    console.log("1 end all process");
                    callback(null, index)
                });
            }
            else {
                callback(null, index);
            }
        }

    ], function (err, result) {
        console.log("2 end all process", obj.task_info.tasknamelist.length, obj.task_info.tasknamelist);
        /**
         * 결과값 ajax 응답
         */
        res.send(obj);

        // ajax 응답후 저장된 dir을 삭제하여 재생성한다
        fs.removeSync('uploads');
        fs.mkdirSync('uploads');
    }); 
}

async function ipfsupload_core(ipfs, files, obj, index, main_core_callback) {

    console.log("core coreitem all", files.coreinfo.corelist, files.coreinfo.corelist.length, index);
    var coreitem = files.coreinfo.corelist[index];
    console.log("core coreitem", coreitem);
    var ostype = coreitem.OS_TYPE;
    var processorlist = coreitem.PROCESSOR; 
    var dlllist = coreitem.DLL; 
    var otherlist = coreitem.OTHER; 

    obj.core_count++;
    console.log("core count", obj.core_count);

    var item_info = {
        OS_TYPE: `${ostype}`,
        PROCESSOR: [],
        DLL: [],
        OTHER: []
    };
    // ostype
    if ((ostype == "WIN") || (ostype == "MAC") || (ostype == "LINUX")) {

        var core_processor_item = {
            core_type: `${ostype}`,
            core_addr:"",
            core_CRC:""
        };

        async.waterfall([

            function (callback) {
                if (processorlist.length > 0) {
                    var i = 0;
                    ipfsupload_core_processor(ipfs, processorlist, item_info, i, callback);//processor
                }
                else {
                    callback(null, item_info);
                }
            },
            function (arg1, callback) {
                var i = 0;
                if (dlllist.length > 0) {
                    ipfsupload_core_dll(ipfs, dlllist, arg1, i, callback);//dll
                }
                else {
                    callback(null, arg1);
                }

            },
            function (arg1, callback) {
                var i = 0;
                if (otherlist.length > 0) {
                    ipfsupload_core_other(ipfs, otherlist, arg1, i, callback);//others
                }
                else {
                    callback(null, arg1);
                }
            },
            function (arg1, callback) {
                var i = 0;
                if (arg1!=null) {
                    ipfsupload_core_info(ipfs, obj, core_processor_item, arg1, i, callback);//others
                }
                else {
                    callback(null, arg1);
                }
            }


        ], function (err, result) {
            index++;
            if (index < files.coreinfo.corelist.length) {
                console.log("core index", index, files.coreinfo.corelist.length);
                ipfsupload_core(ipfs, files, obj, index, main_core_callback);
            }
            else {
                console.log("ipfsupload_1", index);
                main_core_callback(null, index);
            }
        });

    }
    else {
        console.log("there is worng Ostype", ostype);
    }            
}

async function ipfsupload_c1(ipfs,  item_info, Core_info, index, callback) {
    console.log("upload core info: ", item_info);
    var rval = await ipfs.add(JSON.stringify(item_info));
    console.log("upload core info hash : ", rval);
    Core_info.core_addr = rval.path;
    callback(null, Core_info);
  
}

async function ipfsupload_core_info(ipfs, obj, Core_info, item_info, index, callback_core_info) {

    console.log("core file name: ", Core_info.core_type);
    Core_info.core_CRC = "0x12345678";//CalcCRC(JSON.stringify(item_info), len);

    async.waterfall([

        function (callback) {
            ipfsupload_c1(ipfs, item_info, Core_info, index, callback) 
        }

    ], function (err, result) { 
        obj.Core_Process.push(result);
        console.log("end core info", index);           
        callback_core_info(null, index)
    });

}  

async function ipfsupload_c2(ipfs, upload_addr, i, callback) {

    let cont = fs.readFileSync(upload_addr);
    var rval = await ipfs.add(cont);
    console.log("core_process addr: ", rval);
    callback(null, rval, i);  
}

async function ipfsupload_core_processor(ipfs, itemlist, iteminfo, i, callback_pro) {
   
    var upload_addr = itemlist[i];
    var split = upload_addr.split("_");

    itemname = split[split.length - 1];
    console.log("file name: ", itemname);
    async.waterfall([

        function (callback) {
            ipfsupload_c2(ipfs, upload_addr, i, callback)
        }

    ], function (err, result, index) {

        var item = {
            NAME:itemname,
            HASH:result.path
        }
        iteminfo.PROCESSOR.push(item);
        index++;
        if (index < itemlist.length) {
            console.log("core_process index", index);
            ipfsupload_core_processor(ipfs, itemlist, iteminfo, index, callback_pro)
        }
        else {
            console.log("end core_process", index);
            callback_pro(null, iteminfo);
        }
    });

}

async function ipfsupload_c3(ipfs, upload_addr, i, callback) {
    console.log("dll addr: ", upload_addr);
    let cont = fs.readFileSync(upload_addr);
    var rval = await ipfs.add(cont);
    callback(null, rval, i);  
}

async function ipfsupload_core_dll(ipfs, itemlist, iteminfo, i, callback_dll) {
   
    var upload_addr = itemlist[i];
    var split = upload_addr.split("_");

    itemname = split[split.length - 1];
    console.log("file name: ", itemname);
    async.waterfall([

        function (callback) {
            ipfsupload_c3(ipfs, upload_addr, i, callback)
        }

    ], function (err, result, index) {
        
        var item = {
            NAME:itemname,
            HASH:result.path
        }
        console.log("item", item);

        iteminfo.DLL.push(item);
        index++;
        if (index < itemlist.length) {
            console.log("dll index", index);
            ipfsupload_core_dll(ipfs, itemlist, iteminfo, index, callback_dll)
        }
        else {
            console.log("end dll", index);
            callback_dll(null, iteminfo);
        }
    });

}

async function ipfsupload_c4(ipfs, upload_addr, i, callback) {
    console.log("other addr: ", upload_addr);
    let cont = fs.readFileSync(upload_addr);
    var rval = await ipfs.add(cont);
    callback(null, rval, i); 
}

async function ipfsupload_core_other(ipfs, itemlist, iteminfo, i, callback_other) {
   
    var upload_addr = itemlist[i];
    var split = upload_addr.split("_");

    itemname = split[split.length - 1];
    console.log("file name: ", itemname);
    async.waterfall([

        function (callback) {
            ipfsupload_c4(ipfs, upload_addr, i, callback)
        }

    ], function (err, result, index) {
        
        var item = {
            NAME:itemname,
            HASH:result.path
        }
        console.log("item", item);

        iteminfo.OTHER.push(item);
        index++;
        if (index < itemlist.length) {
            console.log("other index", index);
            ipfsupload_core_other(ipfs, itemlist, iteminfo, index, callback_other)
        }
        else {
            console.log("end other", index);
            callback_other(null, iteminfo);
        }
    });

} 


async function ipfsupload_task_processor_update(ipfs, ostype, itemdata, iteminfo, callback_update_pro) {           

    async.waterfall([

        function (callback) {
            ipfsupload_t2(ipfs, itemdata, callback)
        }

    ], function (err, result) {

        var item = {
            task_resource:ostype,
            process_loca:result.path,
            process_CRC:"0x77777777"//calcCRC(itemdata, len)
        }
        console.log("os item", item);
        iteminfo.OS.push(item);
        callback_update_pro(null, iteminfo);
       
    });

} 
async function ipfsupload_task_processor_start(ipfs, itemlist, iteminfo, index, callback_pro_start) {
   
    var ostype = itemlist[index].OS_TYPE
    var upload_addrlist = itemlist[index].P;

    var taskproces ={
        OS_TYPE:ostype,
        P:[]
    }
    async.waterfall([

        function (callback) {

            if(upload_addrlist.length > 0){
                var j = 0;
                ipfsupload_task_processor_sub(ipfs, upload_addrlist, taskproces, j, callback);     
            }
            else{
                //callback_pro_start(null, iteminfo, i);
                callback(null, iteminfo)
            }                                
        }, 
        function (arg1, callback) {

            if(upload_addrlist.length > 0){
    
                ipfsupload_task_processor_update(ipfs, ostype, arg1, iteminfo, function(res1){
                    console.log("1 call back end task processor ", index);
                    callback(null, iteminfo);
                });     
            }
            else{
                console.log("2 call back end task processor ", index);
                callback(null, iteminfo)
            }                                
        } 

    ], function (err, result) {

        index++;
        if (index < itemlist.length) {
            console.log("task processor index", index);
            ipfsupload_task_processor_start(ipfs, itemlist, result, index, callback_pro_start)
        }
        else {
            console.log("end task processor", index);
            callback_pro_start(null, result, index);
        }
    });

}


async function ipfsupload_task(ipfs, task_value, files, obj, index, main_task_callback) {

    var taskiteminfo = files.taskinfo.tasklist[index];
    var sub_task_id = taskiteminfo.sub_task_id;
    var subprocessorlist = taskiteminfo.sub_info;
    var datalist = taskiteminfo.D;
    var infolist = taskiteminfo.I;

    console.log("task count num :", obj.total_task_num);
    obj.total_task_num++;
    // ostype
    if (taskiteminfo != null){

        var task_item_info = {
            "node_quid":"none",
            "sub_task_id":`${sub_task_id}`,
            "process_name":"TASK_" + `${sub_task_id}`,
            "value":`${parseFloat(task_value.toFixed(2))}`,
            "status":"NONE",
            "OS":[],
            "para_info_loca":"",
            "para_CRC":"",
            "data_loca":"",
            "data_CRC":"",
            "cre_date":CurrentTime,
            "time_unit":"m",
            "work_time":"0"                    
        };

        async.waterfall([

            function(callback) {
                if (subprocessorlist.length > 0) {
                    var i = 0;
                    console.log(" start task process 0 :", index, subprocessorlist.length);
                    ipfsupload_task_processor_start(ipfs, subprocessorlist, task_item_info, i, function(res1){
                        console.log(" start task process 2 :", i);
                        callback(null, task_item_info)
                    });//task processor
                }
                else {
                    console.log(" else task process 0 :", index);
                    callback(null, task_item_info);
                }
            },
            function(arg1, callback) {
                var i = 0;
                if (datalist.length > 0) {
                    console.log(" start task data 0 :", i);
                    ipfsupload_task_data_start(ipfs, datalist, arg1, i, function(res1){
                        callback(null, res1);
                    });//data                   
                }
                else {
                    console.log(" else task data 0 :", i);
                    callback(null, arg1);
                }   

            },
            function(arg1, callback) {
                
                var i = 0;
                if (infolist.length > 0) {
                    ipfsupload_taskitem_para(ipfs, infolist, arg1, i, function(res1){
                        callback(null, arg1);
                    });//info
                }
                else {
                    console.log(" else task para 0 :", i);
                    callback(null, arg1);
                }
            },
            function (arg1, callback) {
                if (arg1 != null) {
                    obj.task_info.tasknamelist.push(arg1);
                    console.log("end ipfsupload_add_taskitem", index);   
                    callback(null, arg1)
    
                }
                else {
                    callback(null, arg1);
                }
            }
        ], function (err, result) {

            console.log(" taskitem list index and tasklistbuffer", index, files.taskinfo.tasklist.length);
            index++;
            if (index < files.taskinfo.tasklist.length) {
                ipfsupload_task(ipfs, task_value, files, obj, index, function (res1) {
                    main_task_callback(index);
                });
            }
            else {
                console.log("ipfsupload_1", index);
                main_task_callback(index);
            }
        });

    }
    else {
         console.log("there is worng Ostype", ostype);
         main_task_callback(index);
     }            
}

async function ipfsupload_t1(ipfs, item_info, i, callback) {
    console.log("upload items info: ", item_info);
    var rval = await ipfs.add(JSON.stringify(item_info));
    Core_info.core_addr = rval.path;
    callback(null, Core_info);
}
async function ipfsupload_t2(ipfs, itemdata, callback) {
    var rval = await ipfs.add(JSON.stringify(itemdata));
    callback(null, rval);
}



async function ipfsupload_t3(ipfs, itemlist, i, callback) {
    var upload_addr = itemlist[i];

    console.log("task sub processor addr: ", upload_addr);
    let cont = fs.readFileSync(upload_addr);
    var rval = await ipfs.add(cont);
    callback(null, rval, i);
}

async function ipfsupload_task_processor_sub(ipfs, itemlist, iteminfo, i, callback_sub_pro) {
   
    var upload_addr = itemlist[i];
    var split = upload_addr.split("_");

    itemname = split[split.length - 1];
    console.log("task process file name: ", itemname);

    async.waterfall([

        function (callback) {
            ipfsupload_t3(ipfs, itemlist, i, callback)
        }

    ], function (err, result, index) {

        var item = {
            NAME:itemname,
            HASH:result.path
        }
        console.log("item", item);
        iteminfo.P.push(item);
        index++;
        if (index < itemlist.length) {
            console.log("task sub processor index", index);
            ipfsupload_task_processor_sub(ipfs, itemlist, iteminfo, index, callback_sub_pro)
        }
        else {
            console.log("end task sub processor", index);
            callback_sub_pro(null, iteminfo);
        }
    });

}

async function ipfsupload_t4(ipfs, itemlist, i, callback) {
    var upload_addr = itemlist[i];
    console.log("task data addr: ", upload_addr);
    let cont = fs.readFileSync(upload_addr);
    var rval = await ipfs.add(cont);
    callback(rval, i);
}

async function ipfsupload_task_data_start(ipfs, itemlist, iteminfo, index, callback_data_start) {
   
    var upload_addr = itemlist[index];
    var split = upload_addr.split("_");

    itemname = split[split.length - 1];
    console.log("data file name: ", itemname);
    async.waterfall([

        function (callback) {
            ipfsupload_t4(ipfs, itemlist, index, function( res1, res2){
                callback(null, res1, res2)
            })
        },
        function (arg1, index, callback) {
            iteminfo.data_loca = arg1.path;
            iteminfo.data_CRC = "0x88888888"//clacCRC()
            index++;
            callback(null, index)      
        }

    ], function (err, index) {
        // iteminfo.data_loca = result.path;
        // iteminfo.data_CRC = "0x88888888"//clacCRC()
        // console.log("task data : ", index, iteminfo);
        // index++;

        if (index < itemlist.length) {
            console.log("restart task data index", index);
            ipfsupload_task_data_start(ipfs, itemlist, iteminfo, index, function(res1){
                callback_data_start(iteminfo);
            })
        }
        else{
            callback_data_start(iteminfo);
        }

    });
}

async function ipfsupload_t5(ipfs, itemlist, i, callback) {
    var upload_addr = itemlist[i];
    console.log("task para addr: ", upload_addr);
    let cont = fs.readFileSync(upload_addr);
    var rval = await ipfs.add(cont);
    callback(null, rval, i);
}

async function ipfsupload_taskitem_para(ipfs, itemlist, iteminfo, i, callback_para) {
   
    var upload_addr = itemlist[i];
    var split = upload_addr.split("_");

    itemname = split[split.length - 1];
    console.log("para file name: ", itemname);
    async.waterfall([

        function (callback) {
            ipfsupload_t5(ipfs, itemlist, i, callback)
        }

    ], function (err, result, index) {   

        iteminfo.para_info_loca = result.path;
        iteminfo.para_CRC = "0x99999999"//clacCRC()
        console.log("task para : ", iteminfo);
        index++;
        if (index < itemlist.length) {
            console.log("task para index", index);
            ipfsupload_taskitem_para(ipfs, itemlist, iteminfo, index, callback_para)
        }
        else {
            console.log("end task para", index);
            callback_para(iteminfo);
        }
    });

}
