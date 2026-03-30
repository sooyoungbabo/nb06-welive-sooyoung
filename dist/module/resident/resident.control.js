"use strict";
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
const resident_service_1 = __importDefault(require("./resident.service"));
const myFuns_1 = require("../../lib/myFuns");
const constants_1 = require("../../lib/constants");
const NotFoundError_1 = __importDefault(require("../../middleware/errors/NotFoundError"));
function getList(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = req.query;
        const { residents, totalCount } = yield resident_service_1.default.getList(req.user.id, query);
        const count = residents.length;
        const message = count === 0
            ? `조회된 입주민 결과가 없습니다.`
            : `조회된 입주민 결과가 ${count}건입니다.`;
        res.status(200).json({ totalCount, count, message, residents });
    });
}
function post(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const { building, unitNumber, contact, name, isHouseholder } = req.body;
        const data = {
            apartmentDong: building,
            apartmentHo: unitNumber,
            contact,
            name,
            isHouseholder
        };
        const resident = yield resident_service_1.default.post(req.user.id, data);
        res.status(201).json(resident);
    });
}
// async function user2resident(req: Request, res: Response, next: NextFunction) {
//   const resident = await residentService.user2resident(req.params.id as string);
//   res.status(201).json(buildResidentRes(resident));
// }
function downloadTemplate(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const csv = resident_service_1.default.downloadTemplateCsv();
        const filename = '입주민명부_템플릿.csv';
        const encoded = encodeURIComponent(filename);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="residents.csv"; filename*=UTF-8''${encoded}`);
        res.send(csv);
    });
}
function createManyFromFile(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.file)
            throw new NotFoundError_1.default('파일이 없습니다.');
        const buffer = req.file.buffer;
        const count = yield resident_service_1.default.createManyFromFile(req.user.id, buffer);
        res.status(201).send({ message: `${count}명의 입주민이 등록되었습니다.`, count });
    });
}
function downloadList(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const query = req.query;
        const csv = yield resident_service_1.default.downloadListCsv(req.user.id, query);
        const filename = `아파트_입주민명부_${(0, myFuns_1.getTimestamp)()}.csv`;
        const encodedFilename = encodeURIComponent(filename);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="residents.csv"; filename*=UTF-8''${encodedFilename}`);
        res.send(csv);
    });
}
function get(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const residentId = req.params.id;
        const resident = yield resident_service_1.default.get(req.user.id, residentId);
        res.status(200).json(resident);
    });
}
function patch(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const residentId = req.params.id;
        const { name, contact, building, unitNumber, isHouseholder } = req.body;
        const residentData = {
            name,
            contact,
            apartmentDong: building,
            apartmentHo: unitNumber,
            isHouseholder
        };
        const userData = {
            name,
            contact
        };
        const resident = yield resident_service_1.default.patch(req.user.id, residentId, residentData, userData);
        res.status(200).json(resident);
    });
}
function del(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const residentId = req.params.id;
        // 개발환경일 때는 정말 삭제, 배포환경에선 soft delete
        if (constants_1.NODE_ENV === 'development')
            yield resident_service_1.default.del(req.user.id, residentId);
        else
            yield resident_service_1.default.softDel(req.user.id, residentId);
        res.status(200).send({ message: '작업이 성공적으로 완료되었습니다.' });
    });
}
exports.default = {
    getList,
    post,
    downloadTemplate,
    createManyFromFile,
    downloadList,
    get,
    patch,
    del
};
