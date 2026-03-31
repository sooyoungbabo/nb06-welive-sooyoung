"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const resident_control_1 = __importDefault(require("./resident.control"));
const withTryCatch_1 = __importDefault(require("../../lib/withTryCatch"));
const authenticate_1 = __importDefault(require("../../middleware/authenticate"));
const multer_1 = require("../../middleware/multer");
const express_1 = __importDefault(require("express"));
const authorize_1 = __importDefault(require("../../middleware/authorize"));
const client_1 = require("@prisma/client");
const validateReq_1 = require("../../middleware/validateReq");
const resident_schema_1 = require("./resident.schema");
const residentRouter = express_1.default.Router();
// 입주민 목록 조회
residentRouter.get('/', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateQuery)(resident_schema_1.residentListQuery, resident_schema_1.residentListQueryShape), (0, withTryCatch_1.default)(resident_control_1.default.getList));
// 입주민 리소스 생성 (개별 등록)
residentRouter.post('/', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateBody)(resident_schema_1.residentCreateBody), (0, withTryCatch_1.default)(resident_control_1.default.post));
// 사용자로부터 입주민 리소스 생성
// residentRouter.post(
//   '/from-users/:userId',
//   authenticate(),
//   authorize(UserType.ADMIN),
//   withTryCatch(residentControl.user2resident)
// );
// 입주민 업로드용 템플릿 다운로드
residentRouter.get('/file/template', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, withTryCatch_1.default)(resident_control_1.default.downloadTemplate));
// 파일로부터 입주민 리소스 생성
residentRouter.post('/from-file', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), multer_1.uploadFile.single('file'), resident_control_1.default.createManyFromFile);
// 입주민 목록 파일 다운로드
residentRouter.get('/file', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateQuery)(resident_schema_1.residentListQuery, resident_schema_1.residentListQueryShape), (0, withTryCatch_1.default)(resident_control_1.default.downloadList));
// 입주민 상세 조회
residentRouter.get('/:id', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateParams)(resident_schema_1.residentParams), (0, withTryCatch_1.default)(resident_control_1.default.get));
// 입주민 정보 수정
residentRouter.patch('/:id', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateParams)(resident_schema_1.residentParams), (0, validateReq_1.validateBody)(resident_schema_1.residentCreateBody), (0, withTryCatch_1.default)(resident_control_1.default.patch));
// 입주민 정보 삭제
residentRouter.delete('/:id', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN), (0, validateReq_1.validateParams)(resident_schema_1.residentParams), (0, withTryCatch_1.default)(resident_control_1.default.del));
exports.default = residentRouter;
