import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { prisma } from "@/lib/prisma";
import { EVENT1_PRODUCT_ID, EVENT1_PRODUCT_TITLE } from "@/lib/shop-event1-product";
import {
  absoluteUrl,
  buildPageMetadata,
  event1OgImages,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site-metadata";

import "./event1.css";

const EVENT1_TITLE = "GLIA 온라인 8주 — 1기 모집";
const EVENT1_DESCRIPTION = "몸의 신호를 읽고 스스로 조절하는 8주 온라인 프로그램. 정원 6명.";

export const metadata: Metadata = buildPageMetadata({
  title: EVENT1_TITLE,
  description: EVENT1_DESCRIPTION,
  path: "/event1",
  images: event1OgImages,
  absoluteTitle: true,
});

export default async function Event1Page() {
  const product = await prisma.product.findFirst({
    where: {
      isActive: true,
      OR: [{ id: EVENT1_PRODUCT_ID }, { title: EVENT1_PRODUCT_TITLE }],
    },
    select: { id: true },
  });
  if (!product) notFound();

  const applyHref = `/shop/${product.id}`;

  return (
    <main className="event1">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: EVENT1_TITLE,
          description: EVENT1_DESCRIPTION,
          startDate: "2026-09-07",
          endDate: "2026-11-02",
          eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
          eventStatus: "https://schema.org/EventScheduled",
          image: absoluteUrl(event1OgImages[0].url),
          location: { "@type": "VirtualLocation", url: absoluteUrl("/event1") },
          organizer: { "@type": "Organization", name: SITE_NAME, url: SITE_URL.origin },
        }}
      />
      <header className="hero">
        <div className="narrow hero-inner">
          <div className="eyebrow">GLIA 온라인 8주 · 1기 모집</div>
          <h1>몸을 바꾼 것은<br />만나는 시간이 아니었습니다.</h1>
          <p className="lead">19년간 사람의 몸을 지도하며 확인한 한 가지 —<br />변화는 세션 사이, 혼자 있는 시간에 일어납니다.<br />그 시간을 설계한 8주 과정을 엽니다. 정원 6명.</p>
          <a className="cta" href={applyHref}>인터뷰 신청하기</a>
          <span className="cta-note">신청 마감 8월 15일 · 선착순이 아니라 인터뷰로 확정합니다</span>
        </div>
        <svg className="pulse breathe" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
          <path className="pulse-path" d="M0,60 L140,60 Q160,60 170,45 T200,60 L260,60 L285,20 L305,95 L325,55 L420,55 Q445,55 460,40 T495,60 L580,60 L600,30 L618,88 L636,58 L760,58 Q790,58 805,44 T840,60 L920,60 L942,26 L960,90 L978,60 L1200,60" />
          <circle className="pulse-dot" cx="960" cy="90" r="3.5" />
        </svg>
      </header>

      <section className="story">
        <div className="narrow">
          <div className="eyebrow">한 사람의 이야기</div>
          <h2>작년에 저를 찾아온 분이 있습니다.</h2>
          <p>7년째 사업체를 함께 꾸려온 40대 여성분이었어요.</p>
          <p>몸 관리를 안 하던 분이 아닙니다. 오히려 반대였습니다. 헬스장에서 PT를 받았고, 식이도 검사까지 받아가며 챙기고 있었습니다. 그런데 담당 트레이너가 어느 날 그만두면서, 자기 몸을 맡길 사람이 사라졌습니다. 발바닥 통증 때문에 달리기는 시작할 엄두도 못 내던 시기였고요.</p>
          <p>저와는 대중교통으로 1시간 반 거리. 자주 만날 수 없어서, 한 달에 두 번만 만나기로 했습니다. 대신 첫 세션이 끝나고 숙제를 드렸습니다. 몸의 신호를 알아차리고 스스로 조절하는, 혼자 하는 과제였습니다.</p>
          <p>이분은 숙제를 전부 해 왔습니다. 하고 나서 몸이 어땠는지 피드백도 매번 보내주셨고요.</p>
          <p>두 번째 세션이 끝난 뒤, 발바닥 통증이 사라졌다고 알려오셨습니다. 그리고 걷다가, 살짝 뛰어봤다고요. 심장이 찢어질 것 같았답니다. 그래도 달릴 수는 있었습니다. 10년 만인지 20년 만인지, 본인도 기억이 안 나는 달리기였습니다.</p>
          <div className="turn">변화를 만든 건 저와 만난 두 시간이 아니었습니다.<br />그 사이에 이분이 혼자 한 숙제와, 매번 보내온 피드백이었습니다.</div>
          <p>저는 방향을 잡아주는 사람이었고, 몸을 바꾼 건 본인이었습니다. 만나는 횟수가 적을수록, 오히려 더 성실하게 하시더군요.</p>
          <p><strong>그래서 이 구조를 온라인 프로그램으로 만들었습니다.</strong></p>
          <p className="quiet">* 본인의 동의를 받아, 개인을 특정할 수 없는 형태로 옮긴 실제 사례입니다. 결과는 사람마다 다르며, 이 프로그램은 치료가 아닙니다.</p>
        </div>
      </section>

      <svg className="divider" viewBox="0 0 180 28" aria-hidden="true"><path d="M0,14 L60,14 L72,5 L84,23 L96,10 L110,14 L180,14" /></svg>

      <section>
        <div className="wrap">
          <div className="eyebrow">GLIA 온라인 8주</div>
          <h2>매주, 세 가지가 돌아갑니다.</h2>
          <p className="lead" style={{ maxWidth: 660 }}>19년간 다듬어온 신경 기반 몸 관리를 온라인에서 되도록 만든 과정입니다.<br />배우는 것은 함께, 조정은 각자에게 맞게.</p>
          <div className="cards">
            <div className="card"><div className="tag">함께 · 주 1회</div><h3>라이브 세션 (6명)</h3><p>[요일] [시간], 화상으로 만나 그 주의 주제를 몸으로 익힙니다. 참석이 어려우면 녹화로 볼 수 있지만, 라이브 참석이 기본입니다.</p></div>
            <div className="card"><div className="tag">혼자 · 매일</div><h3>주간 과제</h3><p>그 주에 혼자 할 것을 드립니다. 하루 10~15분. 이 프로그램의 본체는 세션이 아니라 이 시간입니다.</p></div>
            <div className="card"><div className="tag">1:1 · 매주</div><h3>개별 피드백</h3><p>과제 후 몸이 어땠는지 매주 적어 보냅니다. 6명의 기록을 제가 전부 직접 읽고, 사람마다 다음 주 과제를 따로 조정합니다.</p></div>
          </div>
          <div className="hrv-strip">
            <svg viewBox="0 0 64 40" aria-hidden="true"><path d="M2,20 L18,20 L24,8 L30,34 L36,16 L44,20 L62,20" fill="none" stroke="#B8892E" strokeWidth="2" strokeLinecap="round" /></svg>
            <p><strong>8주간 HRV(심박변이도) 측정 기기를 빌려드립니다.</strong> 아침마다 1~2분, 자율신경의 상태를 숫자로 확인하고 주간 기록에 함께 적습니다. 이 숫자는 성적표가 아닙니다 — 내 몸의 신호를 감각으로도, 숫자로도 관찰하는 연습 도구입니다. 기기는 종료 후 반납하며, 보증금 10만원은 전액 돌려드립니다.</p>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 40 }}>
        <div className="narrow">
          <div className="eyebrow">커리큘럼 흐름</div>
          <h2>주제는 함께 배우지만,<br />과제는 같지 않습니다.</h2>
          <div className="weeks">
            {[
              "호흡과 복부 — 몸 안쪽 감각 깨우기",
              "발과 고관절 — 그라운딩, 발이 딛고 올라오는 연결",
              "골반과 척추 — 등뼈의 리듬 되찾기",
              "손과 견관절 — 안정된 어깨를 위한 손과 어깨의 연결",
              "몸통의 나선 — 균형있는 움직임을 위한 회전 운동",
              "호흡의 아래층과 위층 — 눌린 호흡 공간 넓히기",
              "앉은 몸, 보행 패턴 — 일상 자세 연결, 조각을 하나의 흐름으로",
              "나만의 루틴 — 혼자 계속하는 법",
            ].map((title, index) => (
              <div className="week" key={title}>
                <span className="no">{index + 1}주차</span>
                <span className="t">{title}</span>
              </div>
            ))}
          </div>
          <div className="cur-note">같은 주차라도 받는 과제는 사람마다 다릅니다. 여러분이 매주 보내는 기록을 읽고, 지금의 몸 상태와 목표에 맞는 과제를 배정합니다. 8주 뒤에 가져가는 것은 동작 목록이 아니라, <strong>내 몸의 신호를 읽고 스스로 조절하는 방법</strong>입니다.</div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="eyebrow">누구를 위한 과정인가</div><h2>이런 분을 위해 만들었습니다.</h2>
          <div className="fit">
            <div className="fit-col"><h3>맞는 분</h3><ul><li>일 때문에 정기적으로 센터에 다니기 어려운 분</li><li>몸의 불편신호 — 잠, 소화, 통증, 긴장 — 가 계속 이어지는데, 병원에서는 딱히 답을 못 들은 분</li><li>운동을 &apos;받는&apos; 것보다 내 몸을 &apos;배우는&apos; 것을 원하는 분</li><li>믿고 맡기던 선생님·트레이너가 사라져서, 다시 처음부터 설명하기 지친 분</li></ul></div>
            <div className="fit-col no-col"><h3>1기에 맞지 않는 분</h3><ul><li>현재 저에게 오프라인 1:1을 받고 계신 분 — 이미 더 밀도 높은 과정을 하고 계십니다</li><li>주간 과제와 피드백을 할 시간이 없는 분 — 이 프로그램은 과제가 본체입니다</li><li>실시간 지도 없이 몸을 움직이는 것이 아직 불안한 분 — 인터뷰에서 함께 확인합니다</li></ul></div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 20 }}>
        <div className="narrow">
          <div className="eyebrow">1기 안내</div><h2>정원 6명, 인터뷰로 확정합니다.</h2>
          <div className="price-card">
            <div className="price-row"><span className="k">기간</span><span className="v">2026년 9월 7일 ~ 11월 2일 · 8주<small>개강 전 8월 31일(월) 오리엔테이션 라이브 포함 · 10월 5일(대체공휴일)은 라이브 없이 자율 적용 주간</small></span></div>
            <div className="price-row"><span className="k">라이브</span><span className="v">매주 월요일 오전 10:00 · 60분</span></div>
            <div className="price-row"><span className="k">정원</span><span className="v">6명<small>매주 6명의 기록을 직접 읽고 개별 조정하기 때문입니다. 그 이상은 이 방식으로 못 합니다.</small></span></div>
            <div className="price-row"><span className="k">참가비</span><span className="v">49만원 (8주 전체)</span></div>
            <div className="price-row"><span className="k">HRV 기기 보증금</span><span className="v">10만원<small>기기 대여용 · 8주 종료 후 반납하면 전액 돌려드립니다</small></span></div>
            <div className="price-row"><span className="k">결제</span><span className="v">인터뷰 후 계좌이체 안내</span></div>
            <div className="founding"><strong>1기 조건</strong> — 창립 기수라 정가보다 낮게 엽니다. 대신 두 가지를 부탁드립니다.<br />① 8주간 매주 피드백 제출 &nbsp; ② 종료 후 30분 인터뷰, 그리고 익명 처리한 사례 활용 동의</div>
          </div>
        </div>
      </section>

      <section id="apply" style={{ paddingTop: 30 }}>
        <div className="narrow"><div className="eyebrow">신청 방법</div><h2>신청은 인터뷰로 시작합니다.</h2><div className="steps">
          <div className="step"><span className="n">1</span><div><h3>신청</h3><p>[신청 폼 링크 / 카카오톡 채널]로 신청합니다.</p></div></div>
          <div className="step"><span className="n">2</span><div><h3>10~15분 인터뷰</h3><p>전화 또는 화상으로 지금 몸 상태와 목표를 듣고, 이 프로그램이 맞는지 서로 확인합니다.</p></div></div>
          <div className="step"><span className="n">3</span><div><h3>확정</h3><p>맞다고 판단되면 결제 안내를 드리고 자리가 확정됩니다. 맞지 않다고 판단되면 솔직히 말씀드립니다 — 8주를 채우지 못할 분을 받는 것은 저에게도 그분에게도 손해라서요.</p></div></div>
        </div></div>
      </section>

      <section style={{ paddingTop: 20 }}><div className="narrow faq"><div className="eyebrow">자주 묻는 질문</div><h2>궁금해하실 것들</h2>
        <details><summary>1:1 수업인가요?</summary><p>라이브 세션은 6명이 함께합니다. 대신 매주 보내주시는 기록은 제가 한 명씩 읽고, 과제도 사람마다 다르게 조정합니다. 세션은 그룹, 피드백은 1:1입니다.</p></details>
        <details><summary>화면으로 보는데 제 자세를 봐줄 수 있나요?</summary><p>라이브에서 실시간으로 보고, 과제 영상을 보내주시면 따로도 봅니다. 다만 손으로 만져서 교정하는 방식이 아니라, 스스로 알아차리게 안내하는 방식입니다. 19년 해보니 후자가 오래갑니다.</p></details>
        <details><summary>운동 경험이 없어도 되나요?</summary><p>경험보다 과제를 할 의지가 중요합니다. 인터뷰에서 함께 확인합니다.</p></details>
        <details><summary>아픈 곳이 있는데 해도 되나요?</summary><p>이 프로그램은 치료가 아닙니다. 진단이나 치료가 필요한 상태라면 병원이 먼저입니다. 인터뷰에서 상태를 듣고, 맞지 않으면 말씀드립니다.</p></details>
        <details><summary>HRV 기기는 어떻게 받나요?</summary><p>개강 전에 택배로 보내드립니다. 8주 종료 후 반납하시면 보증금 10만원을 전액 돌려드립니다. 측정법은 1주차 라이브에서 함께 익힙니다. 이 기기는 의료 진단 도구가 아니고, 측정값은 치료 근거가 아니라 자기 관찰의 보조 자료입니다.</p></details>
        <details><summary>8주 뒤에는요?</summary><p>혼자 쓸 수 있는 도구를 가져가시는 게 목표입니다. 더 이어가고 싶은 분을 위한 과정은 1기가 끝날 때 안내드립니다.</p></details>
      </div></section>

      <div className="final-cta"><a className="cta" href={applyHref}>인터뷰 신청하기</a><span className="cta-note">신청 마감 8월 15일 · 정원 6명</span></div>
      <footer><div className="narrow"><div className="brand">GLIA</div><p>문의: [카카오톡 채널 / 연락처]<br />본 프로그램은 의료 행위가 아니며, 진단·치료를 대신하지 않습니다.</p></div></footer>
    </main>
  );
}
