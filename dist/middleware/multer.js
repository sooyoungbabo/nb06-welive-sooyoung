"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = exports.uploadImage = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const BadRequestError_1 = __importDefault(require("./errors/BadRequestError"));
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const FILE_SIZE_LIMIT = 5 * 1024 * 1024;
exports.uploadImage = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: FILE_SIZE_LIMIT }, // 파일 크기 설정
    fileFilter: function (req, file, cb) {
        const allowedExt = ['.png', '.jpg', '.jpeg'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !allowedExt.includes(ext)) {
            return cb(new BadRequestError_1.default('png, jpeg, jpg만 가능합니다.'));
        }
        cb(null, true);
    }
    //   fileFilter: function (req, file, cb) {
    //     if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    //       const err = new BadRequestError('png, jpeg, jpg 확장자만 가능합니다.');
    //       return cb(err); //파일 확장자 확인
    //     }
    //     cb(null, true);
    //   }
});
exports.uploadFile = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: FILE_SIZE_LIMIT },
    fileFilter(req, file, cb) {
        if (!file.originalname.endsWith('.csv')) {
            return cb(new BadRequestError_1.default('CSV 파일만 가능합니다.'));
        }
        // if (!['text/csv', 'application/vnd.ms-excel'].includes(file.mimetype)) {
        //   return cb(new BadRequestError('CSV 파일만 가능합니다.'));
        // }
        cb(null, true);
    }
});
