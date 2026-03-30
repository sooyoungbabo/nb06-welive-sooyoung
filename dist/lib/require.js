"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUser = requireUser;
exports.requireApartmentUser = requireApartmentUser;
exports.requireResidentUser = requireResidentUser;
const UnauthorizedError_1 = __importDefault(require("../middleware/errors/UnauthorizedError"));
const ForbiddenError_1 = __importDefault(require("../middleware/errors/ForbiddenError"));
function requireUser(user) {
    if (!user)
        throw new UnauthorizedError_1.default('인증 정보가 없습니다.');
}
function requireApartmentUser(user) {
    if (!user)
        throw new UnauthorizedError_1.default('인증 정보가 없습니다.');
    if (!user.apartmentId)
        throw new ForbiddenError_1.default('아파트에 소속된 사용자만 이용할 수 있습니다.');
}
function requireResidentUser(user) {
    if (!user)
        throw new UnauthorizedError_1.default('인증 정보가 없습니다.');
    if (!user.apartmentId)
        throw new ForbiddenError_1.default('아파트에 소속된 사용자만 이용할 수 있습니다.');
    if (!user.adminId)
        throw new ForbiddenError_1.default('관리자가 있는 아파트이어야 합니다.');
    if (!user.residentId)
        throw new ForbiddenError_1.default('입주민 명부 멤버만 이용할 수 있습니다.');
}
