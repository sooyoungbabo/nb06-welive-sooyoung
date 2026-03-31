"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const apartment_control_1 = __importDefault(require("./apartment.control"));
const withTryCatch_1 = __importDefault(require("../../lib/withTryCatch"));
const authenticate_1 = __importDefault(require("../../middleware/authenticate"));
const authorize_1 = __importDefault(require("../../middleware/authorize"));
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const apartment_schema_1 = require("./apartment.schema");
const validateReq_1 = require("../../middleware/validateReq");
const aptRouter = express_1.default.Router();
// 아파트 목록 조회: 공개
aptRouter.get('/public', (0, validateReq_1.validateQuery)(apartment_schema_1.publicApartmentListQuery, apartment_schema_1.publicApartmentListQueryShape), (0, withTryCatch_1.default)(apartment_control_1.default.publicGetList));
// 아파트 상세 조회: 공개
aptRouter.get('/public/:id', (0, validateReq_1.validateParams)(apartment_schema_1.apartmentParams), (0, withTryCatch_1.default)(apartment_control_1.default.publicGet));
// 아파트 목록 조회
aptRouter.get('/', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN, client_1.UserType.SUPER_ADMIN), (0, validateReq_1.validateQuery)(apartment_schema_1.apartmentListQuery, apartment_schema_1.apartmentListQueryShape), (0, withTryCatch_1.default)(apartment_control_1.default.getList));
// 아파트 상세 조회
aptRouter.get('/:id', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.ADMIN, client_1.UserType.SUPER_ADMIN), (0, validateReq_1.validateParams)(apartment_schema_1.apartmentParams), (0, withTryCatch_1.default)(apartment_control_1.default.get));
exports.default = aptRouter;
