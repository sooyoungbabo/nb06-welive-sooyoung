import { ComplaintStatus } from '@prisma/client';
import { buildWhere } from '../../src/lib/buildQuery';

describe('buildWhere: 검색 조회를 위한 where 객체 구축 함수', () => {
  test('검색 조건이 없으면 빈 where 반환', async () => {
    const result = buildWhere({});
    expect(result).toEqual({});
  });

  test('filters는 contains 검색 조건을 변환', async () => {
    const result = buildWhere({ filters: { title: '층간소음' } });
    expect(result).toEqual({
      title: { contains: '층간소음', mode: 'insensitive' }
    });
  });

  test('복수 filters는 AND로 적용', async () => {
    const result = buildWhere({ filters: { title: '층간소음', name: '김투덜' } });
    expect(result).toEqual({
      title: { contains: '층간소음', mode: 'insensitive' },
      name: { contains: '김투덜', mode: 'insensitive' }
    });
  });

  test('exactFilters는 그대로 매핑', async () => {
    const result = buildWhere({ exactFilters: { status: 'PENDING' } });
    expect(result).toEqual({
      status: ComplaintStatus.PENDING
    });
  });

  test('복수의 exactFilters는 AND로 적용', async () => {
    const result = buildWhere({ exactFilters: { isPublic: false, dong: 101 } });
    expect(result).toEqual({
      isPublic: false,
      dong: 101
    });
  });

  test('filters와 exactFilters는 함께 AND로 적용', async () => {
    const result = buildWhere({
      filters: { title: '층간소음' },
      exactFilters: { isPublic: false }
    });
    expect(result).toEqual({
      title: { contains: '층간소음', mode: 'insensitive' },
      isPublic: false
    });
  });

  it('searchKey는 OR 조건을 반환', () => {
    const result = buildWhere({
      searchKey: {
        keyword: '누수',
        fields: ['title', 'content']
      }
    });

    expect(result).toEqual({
      OR: [
        { title: { contains: '누수', mode: 'insensitive' } },
        { content: { contains: '누수', mode: 'insensitive' } }
      ]
    });
  });

  test('undefined 값은 무시', () => {
    const result = buildWhere({
      filters: { name: undefined }
    });

    expect(result).toEqual({});
  });
});
