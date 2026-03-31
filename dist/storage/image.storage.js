"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const promises_1 = __importStar(require("fs/promises"));
const mime_types_1 = __importDefault(require("mime-types"));
const constants_1 = require("../lib/constants");
const internalServerError_1 = __importDefault(require("../middleware/errors/internalServerError"));
const s3Client_1 = require("../lib/s3Client");
const client_s3_1 = require("@aws-sdk/client-s3");
const bucket = constants_1.BUCKETNAME;
const region = constants_1.REGION;
function fetchImgList(key) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (constants_1.NODE_ENV === 'production') {
            const command = new client_s3_1.ListObjectsV2Command({ Bucket: bucket, Prefix: key });
            try {
                const data = yield s3Client_1.s3Client.send(command);
                return ((_a = data.Contents) !== null && _a !== void 0 ? _a : []).map((obj) => `${constants_1.BASE_URL}/${obj.Key}`);
            }
            catch (err) {
                throw new internalServerError_1.default('AWS S3 fetch failure');
            }
        }
        else {
            const dir = path_1.default.join(constants_1.STATIC_IMG_PATH, key);
            try {
                const files = yield promises_1.default.readdir(dir);
                return files.map((name) => `${constants_1.BASE_URL}/${key}/${name}`);
            }
            catch (_b) {
                return []; //없으면 빈 배열 반환
            }
        }
    });
}
function fetchImg(key) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (constants_1.NODE_ENV === 'production') {
            try {
                const imgObj = yield s3Client_1.s3Client.send(new client_s3_1.GetObjectCommand({ Bucket: bucket, Key: key }));
                const bytes = yield imgObj.Body.transformToByteArray();
                return {
                    body: Buffer.from(bytes),
                    contentType: (_a = imgObj.ContentType) !== null && _a !== void 0 ? _a : 'application/octet-stream'
                };
            }
            catch (err) {
                throw new internalServerError_1.default('AWS S3 fetch failure');
            }
        }
        else {
            const fullPath = path_1.default.join(constants_1.STATIC_IMG_PATH, key);
            const buffer = yield promises_1.default.readFile(fullPath);
            return {
                body: buffer,
                contentType: mime_types_1.default.lookup(fullPath) || 'application/octet-stream'
            };
        }
    });
}
function saveImg(key, file) {
    return __awaiter(this, void 0, void 0, function* () {
        if (constants_1.NODE_ENV === 'production') {
            const params = {
                Bucket: constants_1.BUCKETNAME,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype
            };
            const command = new client_s3_1.PutObjectCommand(params);
            try {
                yield s3Client_1.s3Client.send(command);
            }
            catch (err) {
                throw new internalServerError_1.default('AWS S3 upload failure');
            }
        }
        else {
            const fullPath = path_1.default.join(constants_1.STATIC_IMG_PATH, key);
            yield (0, promises_1.mkdir)(path_1.default.dirname(fullPath), { recursive: true });
            yield (0, promises_1.writeFile)(fullPath, file.buffer);
        }
    });
}
function delImg(key) {
    return __awaiter(this, void 0, void 0, function* () {
        if (constants_1.NODE_ENV === 'production') {
            try {
                yield s3Client_1.s3Client.send(new client_s3_1.DeleteObjectCommand({ Bucket: bucket, Key: key }));
            }
            catch (err) {
                throw new internalServerError_1.default('AWS S3 deletion failure');
            }
        }
        else {
            try {
                const filePath = path_1.default.join(constants_1.STATIC_IMG_PATH, key);
                yield promises_1.default.unlink(filePath);
            }
            catch (err) {
                if (err.code !== 'ENOENT') {
                    throw new internalServerError_1.default('Local file deletion failure');
                }
            }
        }
    });
}
function delImgList(key) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (constants_1.NODE_ENV === 'production') {
            try {
                let command = new client_s3_1.ListObjectsV2Command({ Bucket: bucket, Prefix: key });
                const list = yield s3Client_1.s3Client.send(command);
                if ((_a = list.Contents) === null || _a === void 0 ? void 0 : _a.length) {
                    yield s3Client_1.s3Client.send(new client_s3_1.DeleteObjectsCommand({
                        Bucket: bucket,
                        Delete: {
                            Objects: list.Contents.map((obj) => ({ Key: obj.Key }))
                        }
                    }));
                }
            }
            catch (err) {
                throw new internalServerError_1.default('AWS S3 deletion failure');
            }
        }
        else {
            try {
                const dir = path_1.default.join(constants_1.STATIC_IMG_PATH, key);
                yield promises_1.default.rm(dir, {
                    recursive: true,
                    force: true // ENOENT 자동 무시
                });
            }
            catch (err) {
                throw new internalServerError_1.default('Local file deletion failure');
            }
        }
    });
}
exports.default = {
    fetchImgList,
    fetchImg,
    saveImg,
    delImg,
    delImgList
};
