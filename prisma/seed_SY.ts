import {
  PrismaClient,
  UserType,
  JoinStatus,
  ApprovalStatus,
  BoardType,
  NoticeType,
  Prisma,
  PollStatus,
  ComplaintStatus,
  NotificationType,
  CommentType,
  EventType,
  HouseholdRole
} from '@prisma/client';
import { fakerKO as faker } from '@faker-js/faker';
import NotFoundError from '../src/middleware/errors/NotFoundError';
import { complaintItems, noticeItems, commentTexts } from './seed_rawData';
import { getRandomNo, getUniqueRandomNOs, shuffleArray } from '../src/lib/myFuns';
import { hashingPassword, getRandomDong, getRandomHo, getDongRange } from './seed_utils';

const prisma = new PrismaClient();

async function main() {
  console.log('Deleting old data...');
  console.log('');
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.vote.deleteMany(),
    prisma.pollOption.deleteMany(),
    prisma.poll.deleteMany(),
    prisma.notice.deleteMany(),
    prisma.complaint.deleteMany(),
    prisma.board.deleteMany(),
    prisma.event.deleteMany(),
    prisma.resident.deleteMany(),
    prisma.user.deleteMany(),
    prisma.apartment.deleteMany()
  ]);

  const nApts = 3;
  const nUsers = 300;
  const nSeeds = 20;
  const nComplaints = getRandomNo(1, 3);
  const nComments = getRandomNo(1, 3);
  const nNotices = getRandomNo(1, 3);

  const apartmentData = [];
  for (let i = 0; i < nApts; i++) {
    const tempApt = {
      name: `아파트${i}`,
      address: faker.location.streetAddress(),
      apartmentManagementNumber: faker.phone.number(),
      description: '청정한 환경과 좋은 학군을 가진 살기좋은 아파트입니다.',
      endComplexNumber: faker.number.int({ min: 1, max: 2 }),
      endBuildingNumber: faker.number.int({ min: 2, max: 5 }),
      endFloorNumber: faker.number.int({ min: 3, max: 10 }),
      endUnitNumber: faker.number.int({ min: 1, max: 2 }),
      apartmentStatus: ApprovalStatus.APPROVED
    };
    apartmentData.push(tempApt);
  }

  const superAdminData = {
    username: 'superadmin',
    password: await hashingPassword('password0!'),
    contact: faker.phone.number(),
    name: faker.person.fullName(),
    email: 'superadmin@test.com',
    role: UserType.SUPER_ADMIN,
    joinStatus: JoinStatus.APPROVED
  };

  const adminData = [];
  for (let i = 0; i < apartmentData.length; i++) {
    const tempAdmin = {
      username: `admin${i}`,
      password: await hashingPassword(`password0!`),
      contact: faker.phone.number(),
      name: faker.person.fullName(),
      email: `admin${i}@test.com`,
      role: UserType.ADMIN,
      joinStatus: JoinStatus.APPROVED
    };
    adminData.push(tempAdmin);
  }

  const rawUserData = [];
  for (let i = 0; i < nUsers; i++) {
    const tempRawUser = {
      username: `user${i}`,
      password: await hashingPassword(`password0!`),
      contact: faker.phone.number(), //.replace(/\D/g, ''),
      name: faker.person.fullName(),
      email: `user${i}@test.com`,
      role: UserType.USER,
      joinStatus: JoinStatus.APPROVED
    };
    rawUserData.push(tempRawUser);
  }

  console.log('Seeding started...');
  console.log('');
  const apts = [];
  const admins = [];
  const boards = [];
  const notifications = [];

  //----------------------------------------------------------------------------
  console.log('🌱 Seeding superAdmins...');
  const superAdminCreated = await prisma.user.create({ data: superAdminData });

  //----------------------------------------------------------------------------
  console.log('🌱 Seeding apartments, admins and boards (3/apt)...');
  for (let i = 0; i < apartmentData.length; i++) {
    // 아파트 등록
    const tempAptData = apartmentData[i];
    const aptCreated = await prisma.apartment.create({ data: tempAptData });
    apts.push(aptCreated);

    // 관리자 등록
    const tempAdminData = adminData[i];
    const adminCreated = await prisma.user.create({
      data: {
        ...tempAdminData,
        apartment: { connect: { id: aptCreated.id } }
      }
    });
    admins.push(adminCreated);

    // Notification 등록: 수퍼관리자에게 관리자 가입신청 알림
    const notiCreated = await prisma.notification.create({
      data: {
        notiType: NotificationType.AUTH_ADMIN_APPLIED,
        targetId: adminCreated.id,
        content: `[알림] 가입신청 (${adminCreated.name}님)`,
        isChecked: true,
        receiver: { connect: { id: superAdminCreated.id } }
      }
    });
    notifications.push(notiCreated);

    // 3종 보드 생성
    const createdNoticeBoard = await prisma.board.create({
      data: {
        boardType: BoardType.NOTICE,
        apartment: { connect: { id: aptCreated.id } }
      }
    });
    boards.push(createdNoticeBoard);

    const createdComplaintBoard = await prisma.board.create({
      data: {
        boardType: BoardType.COMPLAINT,
        apartment: { connect: { id: aptCreated.id } }
      }
    });
    boards.push(createdComplaintBoard);

    const createdPollBoard = await prisma.board.create({
      data: {
        boardType: BoardType.POLL,
        apartment: { connect: { id: aptCreated.id } }
      }
    });
    boards.push(createdPollBoard);
  }

  //----------------------------------------------------------------------------
  console.log('🌱 Seeding users, residents...');

  // User 등록
  const users = [];
  for (let i = 0; i < rawUserData.length; i++) {
    const aptNo = getRandomNo(0, apts.length - 1);
    const aptId = apts[aptNo].id;
    const apartmentDong = String(
      getRandomDong(apts[aptNo].endComplexNumber, apts[aptNo].endBuildingNumber)
    );
    const apartmentHo = String(getRandomHo(apts[aptNo].endFloorNumber, apts[aptNo].endUnitNumber));

    const userData = rawUserData[i];
    const residentData = {
      apartmentId: aptId,
      apartmentDong,
      apartmentHo,
      contact: userData.contact,
      name: userData.name,
      email: userData.email,
      isRegistered: true,
      isHouseholder: HouseholdRole.HOUSEHOLDER,
      approvalStatus: userData.joinStatus
    };

    const userCreated = await prisma.user.create({
      data: {
        ...userData,
        apartment: { connect: { id: aptId } },
        resident: { create: residentData }
      }
    });
    users.push(userCreated);

    // Notification 등록: User 등록을 admin에게 알림
    const admin = await prisma.user.findFirst({
      where: {
        apartmentId: aptId,
        role: UserType.ADMIN,
        deletedAt: null
      }
    });
    if (!admin) throw new NotFoundError('Admin not found');

    const notiCreated = await prisma.notification.create({
      data: {
        notiType: NotificationType.AUTH_USER_APPLIED,
        targetId: userCreated.id,
        content: `[알림] 가입신청 (${userCreated.name}님)`,
        isChecked: true,
        receiver: { connect: { id: admin.id } }
      }
    });
    notifications.push(notiCreated);
  }
  //----------------------------------------------------------------------------
  console.log('🌱 Seeding complaints, notices, polls, notifications, events, etc...');
  const complaints = [];
  const comments = [];
  const notices = [];
  const polls = [];
  const pollOptions = [];
  const votes = [];
  const events = [];

  for (let i = 0; i < nSeeds; i++) {
    // nSeed: 아파트를 몇번 선택하는가
    const aptNo = getRandomNo(0, apts.length - 1);
    const apt = await prisma.apartment.findUnique({
      where: { id: apts[aptNo].id },
      include: { boards: true, users: true }
    });
    if (!apt) throw new NotFoundError('Apartment not found');

    const adminId = apt.users.find((user) => user.role === UserType.ADMIN)?.id;
    if (!adminId) throw new NotFoundError('Admin not found');

    // const residents = await prisma.resident.findMany({
    //   where: { apartmentId: apt.id, isRegistered: true }
    // });

    if (!apt.users) throw new NotFoundError('Users not found');
    const users = apt.users.filter((user) => user.role === UserType.USER);

    if (!apt.boards) throw new NotFoundError('Board not found');
    if (apt.boards.length !== 3) throw new Error('Must be 3 boreds/apt');

    // 3종 boardId 준비
    const boardId_notice = apt.boards.find((b) => b.boardType === BoardType.NOTICE)?.id;
    const boardId_poll = apt.boards.find((b) => b.boardType === BoardType.POLL)?.id;
    const boardId_complaint = apt.boards.find((b) => b.boardType === BoardType.COMPLAINT)?.id;

    // complaint 등록
    for (let j = 0; j < nComplaints; j++) {
      const complainantId = faker.helpers.arrayElement(users).id;
      const complainant = await prisma.user.findUniqueOrThrow({ where: { id: complainantId } });
      const item = faker.helpers.arrayElement(complaintItems);
      const complaintData = {
        title: item.title,
        content: item.content,
        isPublic: true,
        status: ComplaintStatus.RESOLVED,
        viewCount: (users.length * getRandomNo(13, 30)) / 10,
        creator: { connect: { id: complainantId } },
        admin: { connect: { id: adminId } },
        board: { connect: { id: boardId_complaint } }
      };
      const complaintCreated = await prisma.complaint.create({ data: complaintData });
      complaints.push(complaintCreated);

      // complaint comment 등록
      for (let c = 0; c < nComments; c++) {
        let commentorId;
        do {
          commentorId = users[getRandomNo(0, users.length - 1)].id;
        } while (commentorId === complainantId);

        const commentStr = commentTexts[getRandomNo(0, commentTexts.length - 1)];
        const commentCreated = await prisma.comment.create({
          data: {
            targetType: CommentType.COMPLAINT,
            targetId: complaintCreated.id,
            content: commentStr,
            creator: { connect: { id: commentorId } }
          }
        });
        comments.push(commentCreated);
      }

      // notification 등록: 민원 등록시 admin에게, 민원상태 변경시 creator에게
      let notiCreated = await prisma.notification.create({
        data: {
          notiType: NotificationType.COMPLAINT_RAISED,
          targetId: complaintCreated.id,
          content: `[알림] 민원등록 (${complainant.name}님)`,
          isChecked: true,
          receiver: { connect: { id: adminId } }
        }
      });
      notifications.push(notiCreated);
      notiCreated = await prisma.notification.create({
        data: {
          notiType: NotificationType.COMPLAINT_RESOLVED,
          targetId: complaintCreated.id,
          content: `[알림] 민원종결 (${complainant.name}님)`,
          isChecked: true,
          receiver: { connect: { id: complainantId } }
        }
      });
      notifications.push(notiCreated);
    }

    // 공지, 투표, 알림, 이벤트
    for (let j = 0; j < nNotices; j++) {
      const randomType = faker.helpers.arrayElement(Object.values(NoticeType)); // 6종 공지
      const items = noticeItems.filter((b) => b.type === randomType); // 해당 공지타입을 모두 가져옴
      const item = faker.helpers.arrayElement(items); // 그 중 1 item을 무작위적으로 고름

      // notice data 준비
      const noticeData: Prisma.NoticeCreateInput = {
        category: randomType,
        startDate: item.startDate ? new Date(item.startDate) : null,
        endDate: item.endDate ? new Date(item.endDate) : null,
        title: item.title,
        content: item.content,
        viewCount: getRandomNo(users.length - 3, users.length * 2),
        board: { connect: { id: boardId_notice } },
        admin: { connect: { id: adminId } }
      };

      // 공지 유형이 투표인 경우, poll, pollOptions, votes, event, notification 등록
      let pollCreated;
      if (randomType === NoticeType.RESIDENT_VOTE) {
        // poll 등록
        const dongRange = getDongRange(apts[aptNo].endComplexNumber, apts[aptNo].endBuildingNumber);

        let voters;
        let residents;
        let pollTarget;
        do {
          pollTarget = faker.helpers.arrayElement(dongRange);
          if (pollTarget === 0) voters = users;
          else {
            residents = await prisma.resident.findMany({
              where: {
                apartmentId: apts[aptNo].id,
                apartmentDong: String(pollTarget),
                isRegistered: true
              },
              select: { userId: true }
            });
            voters = residents.flatMap((r) => (r.userId !== null ? [{ id: r.userId }] : []));
          }
        } while (voters.length < 2);

        const pollData = {
          buildingPermission: pollTarget,
          title: item.title,
          description: item.content,
          startDate: item.startDate ? new Date(item.startDate) : new Date('2025-01-01'),
          endDate: item.endDate ? new Date(item.endDate) : new Date('2025-12-31'),
          status: PollStatus.CLOSED,
          board: { connect: { id: boardId_poll } },
          admin: { connect: { id: adminId } }
        };
        pollCreated = await prisma.poll.create({ data: pollData });
        polls.push(pollCreated);

        // pollOption 등록
        const participationRate = getRandomNo(80, 100) / 100; // 80% 이상 참여
        const nVotes = Math.floor(voters.length * participationRate);

        const winRate = getRandomNo(60, 100) / 100; // 60% 이상 득표
        let nVotes_win = Math.floor(nVotes * winRate);
        let nVotes_lost = nVotes - nVotes_win;

        if (nVotes_win === nVotes_lost && nVotes > 0) {
          nVotes_win++;
          nVotes_lost--;
        }

        if (nVotes_win > nVotes || nVotes_lost < 0)
          throw new Error('Vote distribution logic broken');

        const pollResult = faker.helpers.arrayElement(['찬성', '반대']);

        let optionData;
        if (pollResult === '찬성') {
          optionData = [
            { content: '찬성', voteCount: nVotes_win },
            { content: '반대', voteCount: nVotes_lost }
          ];
          for (const option of optionData) {
            const optionCreated = await prisma.pollOption.create({
              data: {
                ...option,
                poll: { connect: { id: pollCreated.id } }
              }
            });
            pollOptions.push(optionCreated);
          }
        } else {
          optionData = [
            { content: '찬성', voteCount: nVotes_lost },
            { content: '반대', voteCount: nVotes_win }
          ];
          for (const option of optionData) {
            const optionCreated = await prisma.pollOption.create({
              data: {
                ...option,
                poll: { connect: { id: pollCreated.id } }
              }
            });
            pollOptions.push(optionCreated);
          }
        }

        // votes 등록
        // 투표에 참가한 수만큼 user를 random하게 뽑아서, 순서를 뒤섞어 놓기
        const votedShuffled = shuffleArray(getUniqueRandomNOs(0, voters.length - 1, nVotes));

        let optionId;
        // winning vote를 한 사람들 수 만큼 앞에서 자름
        if (pollResult === '찬성') {
          for (let n = 0; n < nVotes_win; n++) {
            optionId = pollOptions[pollOptions.length - 2].id;
            const voterId = voters[votedShuffled[n]].id;
            const voteCreated = await prisma.vote.create({
              data: {
                poll: { connect: { id: pollCreated.id } },
                options: { connect: { id: optionId } },
                voter: { connect: { id: voterId } }
              }
            });
            votes.push(voteCreated);
          }
          for (let n = 0; n < nVotes_lost; n++) {
            optionId = pollOptions[pollOptions.length - 1].id;
            const voterId = voters[votedShuffled[nVotes - n - 1]].id;
            const voteCreated = await prisma.vote.create({
              data: {
                poll: { connect: { id: pollCreated.id } },
                options: { connect: { id: optionId } },
                voter: { connect: { id: voterId } }
              }
            });
            votes.push(voteCreated);
          }
        } else {
          for (let n = 0; n < nVotes_lost; n++) {
            optionId = pollOptions[pollOptions.length - 2].id;
            const voterId = voters[votedShuffled[n]].id;
            const voteCreated = await prisma.vote.create({
              data: {
                poll: { connect: { id: pollCreated.id } },
                options: { connect: { id: optionId } },
                voter: { connect: { id: voterId } }
              }
            });
            votes.push(voteCreated);
          }
          for (let n = 0; n < nVotes_win; n++) {
            optionId = pollOptions[pollOptions.length - 1].id;
            const voterId = voters[votedShuffled[nVotes - n - 1]].id;
            const voteCreated = await prisma.vote.create({
              data: {
                poll: { connect: { id: pollCreated.id } },
                options: { connect: { id: optionId } },
                voter: { connect: { id: voterId } }
              }
            });
            votes.push(voteCreated);
          }
        }

        // 투표 notice 등록
        const noticeCreated = await prisma.notice.create({
          data: { ...noticeData, poll: { connect: { id: pollCreated.id } } }
        });
        notices.push(noticeCreated);

        // event 등록
        const eventCreated = await prisma.event.create({
          data: {
            eventType: EventType.POLL,
            title: `${randomType}: ${item.title}`,
            startDate: pollCreated.startDate,
            endDate: pollCreated.endDate,
            poll: { connect: { id: pollCreated.id } }
          }
        });
        events.push(eventCreated);

        // notification 등록: poll 종료시 전체 공지
        for (const user of users) {
          const notiCreated = await prisma.notification.create({
            data: {
              notiType: NotificationType.POLL_CLOSED,
              targetId: pollCreated.id,
              content: `[알림] 투표종료 (${item.title}, 전체)`,
              isChecked: true,
              receiver: { connect: { id: user.id } }
            }
          });
          notifications.push(notiCreated);
        }
      } else {
        // 일반 notice와 그에 대한 event, notifidcation, 댓글 등록
        const noticeCreated = await prisma.notice.create({ data: noticeData });
        notices.push(noticeCreated);

        // 날짜가 있는 notice는 event 등록
        if (noticeCreated.startDate) {
          let eventData = {
            eventType: EventType.NOTICE,
            title: `${randomType}: ${item.title}`,
            startDate: noticeCreated.startDate,
            endDate: noticeCreated.endDate,
            notice: { connect: { id: noticeCreated.id } }
          };
          const eventCreated = await prisma.event.create({ data: eventData });
          events.push(eventCreated);
        }

        // notification 생성: 공지 등록 시 (알림 등록 순서를 대충 맞추기 위하여 마지막에)
        for (const user of users) {
          let notiCreated = await prisma.notification.create({
            data: {
              notiType: NotificationType.NOTICE,
              targetId: noticeCreated.id,
              content: `[알림] 공지등록 (${item.title})`,
              isChecked: true,
              receiver: { connect: { id: user.id } }
            }
          });
          notifications.push(notiCreated);
        }

        // notice comment 등록
        for (let c = 0; c < getRandomNo(0, 5); c++) {
          const commentorId = faker.helpers.arrayElement(users).id;
          const commentStr = commentTexts[getRandomNo(0, commentTexts.length - 1)];

          const commentCreated = await prisma.comment.create({
            data: {
              targetType: CommentType.NOTICE,
              targetId: noticeCreated.id,
              content: commentStr,
              creator: { connect: { id: commentorId } }
            }
          });
          comments.push(commentCreated);
        }
      }
    }
  }

  console.log('');
  console.log('Seeding finished');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
