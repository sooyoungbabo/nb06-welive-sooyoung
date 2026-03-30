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
const prisma_1 = __importDefault(require("../../lib/prisma"));
// 공동 1위를 가정한 집계
// { sum: 37, max: 12, winners: ['C안', 'A안']}
function getPollResult(pollId) {
    return __awaiter(this, void 0, void 0, function* () {
        const pollOptions = yield prisma_1.default.pollOption.findMany({ where: { pollId } });
        return pollOptions.reduce((acc, cur) => {
            acc.sum += cur.voteCount;
            if (cur.voteCount > acc.max) {
                acc.max = cur.voteCount;
                acc.winners = [cur.title];
            }
            else if (cur.voteCount === acc.max) {
                acc.winners.push(cur.title);
            }
            return acc;
        }, { sum: 0, max: -Infinity, winners: [] });
    });
}
