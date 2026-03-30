"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const vote_control_1 = __importDefault(require("./vote.control"));
const client_1 = require("@prisma/client");
const validateReq_1 = require("../../middleware/validateReq");
const authenticate_1 = __importDefault(require("../../middleware/authenticate"));
const authorize_1 = __importDefault(require("../../middleware/authorize"));
const vote_schema_1 = require("./vote.schema");
const voteRouter = express_1.default.Router();
// 투표하기
voteRouter.post('/:optionId/vote', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.USER), (0, validateReq_1.validateParams)(vote_schema_1.voteParams), vote_control_1.default.vote);
// 투표 취소
voteRouter.delete('/:optionId/vote', (0, authenticate_1.default)(), (0, authorize_1.default)(client_1.UserType.USER), (0, validateReq_1.validateParams)(vote_schema_1.voteParams), vote_control_1.default.cancelVote);
exports.default = voteRouter;
