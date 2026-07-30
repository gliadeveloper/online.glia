import { excerptFromMarkdown } from "../src/lib/post-content";
import { prisma } from "../src/lib/prisma";

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

type SeedUserIds = {
  demoId: string;
  coachId: string;
  customerId: string;
  adminId: string;
};

type CommentSpec = {
  userId: string;
  body: string;
};

type ChildPostSpec = {
  slug: string;
  userId: string;
  title: string;
  bodyMarkdown: string;
  publishedAt: Date;
  viewCount?: number;
  comments?: CommentSpec[];
  postLikes?: string[];
};

type RootPostSpec = {
  slug: string;
  userId: string;
  title: string;
  bodyMarkdown: string;
  publishedAt: Date;
  viewCount: number;
  comments: CommentSpec[];
  postLikes: string[];
  commentLikes?: Record<number, string[]>;
  childPosts?: ChildPostSpec[];
};

async function seedPostEngagement(
  postId: string,
  spec: {
    comments: CommentSpec[];
    postLikes: string[];
    commentLikes?: Record<number, string[]>;
  },
) {
  const commentIndexToId = new Map<number, string>();

  for (let index = 0; index < spec.comments.length; index++) {
    const commentSpec = spec.comments[index]!;
    const comment = await prisma.postComment.create({
      data: {
        postId,
        userId: commentSpec.userId,
        bodyMarkdown: commentSpec.body,
        status: "PUBLISHED",
        likeCount: 0,
      },
    });
    commentIndexToId.set(index, comment.id);
  }

  for (const userId of spec.postLikes) {
    await prisma.postLike.create({ data: { postId, userId } });
  }

  for (const [indexKey, likerIds] of Object.entries(spec.commentLikes ?? {})) {
    const commentId = commentIndexToId.get(Number(indexKey));
    if (!commentId) continue;

    for (const userId of likerIds) {
      await prisma.postCommentLike.create({ data: { commentId, userId } });
    }

    await prisma.postComment.update({
      where: { id: commentId },
      data: { likeCount: likerIds.length },
    });
  }

  await prisma.post.update({
    where: { id: postId },
    data: {
      likeCount: spec.postLikes.length,
      commentCount: spec.comments.length,
    },
  });
}

export async function seedCommunityPosts(userIds: SeedUserIds) {
  await prisma.post.deleteMany({});

  const roots: RootPostSpec[] = [
    {
      slug: "nextjs-app-router-study-notes",
      userId: userIds.demoId,
      title: "App Router 3주차 정리 — Server Component와 캐싱",
      publishedAt: daysAgo(2),
      viewCount: 128,
      bodyMarkdown: `## 왜 Server Component부터 잡았나

Next.js App Router에서는 **기본이 Server Component**입니다.

궁금한 점은 **하위 글**로 이어서 작성하거나 댓글로 남겨주세요!`,
      comments: [
        { userId: userIds.coachId, body: "체크리스트 구성 좋네요. Server Action부터 적용해 보세요." },
        { userId: userIds.customerId, body: "표 정리가 특히 도움됐어요!" },
      ],
      postLikes: [userIds.coachId, userIds.customerId, userIds.adminId],
      childPosts: [
        {
          slug: "server-action-checkin-followup",
          userId: userIds.demoId,
          title: "[하위 글] 체크인 폼에 Server Action 붙인 후기",
          publishedAt: daysAgo(1),
          viewCount: 42,
          bodyMarkdown: `## 적용 범위

데일리 체크인 저장을 Server Action으로 옮겼습니다.

\`\`\`ts
"use server";
export async function saveCheckIn() { /* ... */ }
\`\`\`

부모 글 주제(Server/Client 경계)의 **실전 follow-up** 입니다.`,
          comments: [{ userId: userIds.coachId, body: "폼 pending UI까지 붙이면 UX가 한층 좋아집니다." }],
          postLikes: [userIds.coachId],
        },
        {
          slug: "use-client-boundary-notes",
          userId: userIds.coachId,
          title: "[하위 글] use client는 leaf에만",
          publishedAt: daysAgo(1),
          viewCount: 31,
          bodyMarkdown: `상위 레이아웃에 \`use client\`를 두면 **하위 트리 전체**가 클라이언트로 내려갑니다.

버튼·토글 같은 **작은 leaf**에만 두는 것을 권장합니다.`,
          comments: [{ userId: userIds.customerId, body: "이해가 훨씬 쉬워졌어요." }],
          postLikes: [userIds.demoId],
        },
      ],
    },
    {
      slug: "prisma-v7-adapter-notes",
      userId: userIds.coachId,
      title: "Prisma 7 + SQLite adapter 마이그레이션 후기",
      publishedAt: daysAgo(5),
      viewCount: 94,
      bodyMarkdown: `Prisma ORM v7에서는 **driver adapter가 필수**입니다.

\`\`\`ts
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
\`\`\``,
      comments: [
        { userId: userIds.demoId, body: "generate output 경로만 맞추면 타입 추론이 깔끔해졌어요." },
        { userId: userIds.adminId, body: "CI migrate deploy 순서도 정리하면 좋겠어요." },
      ],
      postLikes: [userIds.demoId, userIds.adminId],
      commentLikes: { 0: [userIds.coachId] },
    },
    {
      slug: "weekly-study-routine",
      userId: userIds.customerId,
      title: "직장인 부트캠프 병행 — 주간 학습 루틴 공유",
      publishedAt: daysAgo(8),
      viewCount: 211,
      bodyMarkdown: `## weekly rhythm

- 월·수·금 06:30 VOD 1레슨
- 토 코칭 세션 전 질문 정리`,
      comments: [
        { userId: userIds.demoId, body: "25분 타이머 쓰면 집중력이 확 올라갑니다." },
      ],
      postLikes: [userIds.demoId, userIds.coachId],
      commentLikes: { 0: [userIds.customerId] },
    },
    {
      slug: "react-markdown-community-guide",
      userId: userIds.coachId,
      title: "커뮤니티 Markdown 작성 가이드",
      publishedAt: daysAgo(1),
      viewCount: 56,
      bodyMarkdown: `Post 본문은 **Markdown** + 미리보기, **댓글**은 plain text입니다.

- **하위 글**: 부모 Post에 연결된 새 Post`,
      comments: [
        { userId: userIds.demoId, body: "역할 분리가 명확해서 좋네요." },
        { userId: userIds.customerId, body: "하위 글 작성 버튼 잘 보입니다 👍" },
      ],
      postLikes: [userIds.demoId, userIds.customerId],
    },
    {
      slug: "lms-access-period-qa",
      userId: userIds.demoId,
      title: "90일 수강 vs 평생 — Shop 연장/복구 차이 질문",
      publishedAt: daysAgo(3),
      viewCount: 167,
      bodyMarkdown: `**연장(extend)** vs **복구(restore)** 차이가 헷갈립니다. 답변은 댓글 또는 하위 글로!`,
      comments: [
        {
          userId: userIds.coachId,
          body: "1번 → 다운그레이드 없음(skip). 2번 → partial fulfillment 맞습니다.",
        },
        { userId: userIds.customerId, body: "qa-expired 계정으로 extend/restore 링크 확인했어요." },
      ],
      postLikes: [userIds.coachId, userIds.customerId, userIds.adminId],
      commentLikes: { 0: [userIds.demoId] },
      childPosts: [
        {
          slug: "lms-access-shop-cta-screenshots",
          userId: userIds.customerId,
          title: "[하위 글] Shop CTA 케이스별 정리",
          publishedAt: daysAgo(2),
          viewCount: 38,
          bodyMarkdown: `부모 질문 글에 대한 **정리 하위 글**입니다.

| 상태 | VOD SKU | 번들 SKU |
|------|---------|----------|
| 만료 | extend | restore |`,
          comments: [{ userId: userIds.demoId, body: "표로 정리하니 한눈에 들어오네요." }],
          postLikes: [userIds.demoId, userIds.coachId],
        },
      ],
    },
  ];

  let rootCount = 0;
  let childCount = 0;

  for (const spec of roots) {
    const post = await prisma.post.create({
      data: {
        userId: spec.userId,
        slug: spec.slug,
        title: spec.title,
        bodyMarkdown: spec.bodyMarkdown,
        excerpt: excerptFromMarkdown(spec.bodyMarkdown),
        status: "PUBLISHED",
        publishedAt: spec.publishedAt,
        viewCount: spec.viewCount,
        likeCount: 0,
        commentCount: 0,
        childPostCount: 0,
      },
    });

    rootCount += 1;

    await seedPostEngagement(post.id, {
      comments: spec.comments,
      postLikes: spec.postLikes,
      commentLikes: spec.commentLikes,
    });

    for (const childSpec of spec.childPosts ?? []) {
      const child = await prisma.post.create({
        data: {
          userId: childSpec.userId,
          slug: childSpec.slug,
          title: childSpec.title,
          bodyMarkdown: childSpec.bodyMarkdown,
          excerpt: excerptFromMarkdown(childSpec.bodyMarkdown),
          status: "PUBLISHED",
          publishedAt: childSpec.publishedAt,
          viewCount: childSpec.viewCount ?? 0,
          parentPostId: post.id,
          rootPostId: post.id,
          likeCount: 0,
          commentCount: 0,
          childPostCount: 0,
        },
      });

      childCount += 1;

      await seedPostEngagement(child.id, {
        comments: childSpec.comments ?? [],
        postLikes: childSpec.postLikes ?? [],
      });
    }

    if ((spec.childPosts ?? []).length > 0) {
      await prisma.post.update({
        where: { id: post.id },
        data: { childPostCount: spec.childPosts!.length },
      });
    }
  }

  console.log(
    `Community: ${rootCount} root posts, ${childCount} child posts, comments & likes seeded.`,
  );
}
