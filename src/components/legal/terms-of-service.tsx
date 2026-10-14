import Link from "next/link";

import { siteBusiness } from "@/lib/site-business";

import "@/components/site/site-legal-footer.css";

export function TermsOfService() {
  return (
    <div className="glia-legal-page">
      <header className="glia-legal-page__intro">
        <h1>이용약관</h1>
        <p>시행일자: 2026. 10. 14.</p>
      </header>
      <div className="glia-legal-doc">
        <p>
          이 약관은 {siteBusiness.name}(대표 {siteBusiness.representative}, 이하 “회사”)가 운영하는
          온라인 서비스의 이용 조건입니다. 회원은 가입과 결제 전에 이 약관과{" "}
          <Link href="/legal/refund">취소 및 환불정책</Link>,{" "}
          <Link href="/legal/privacy">개인정보 처리방침</Link>을 확인합니다.
        </p>

        <h2>1. 서비스</h2>
        <p>
          회사는 수강(VOD), 코칭, 수강과 코칭을 함께 구성하는 상품, 커뮤니티, 데일리 체크인을
          제공합니다. 이 서비스는 의료 행위가 아니며 진단이나 치료를 대신하지 않습니다.
        </p>

        <h2>2. 가입</h2>
        <ol>
          <li>만 14세 이상만 가입할 수 있습니다.</li>
          <li>회원은 이메일 또는 연결한 카카오 계정으로 가입하고, 정확한 정보를 제공합니다.</li>
          <li>계정과 비밀번호는 회원 본인이 관리합니다. 계정을 다른 사람과 공유할 수 없습니다.</li>
        </ol>

        <h2>3. 상품과 결제</h2>
        <ol>
          <li>상품의 구성, 기간, 가격은 상품 상세에 표시한 내용을 따릅니다.</li>
          <li>결제 금액은 상품 가격에서 적용된 할인과 쿠폰을 뺀 금액입니다. 화면의 결제 금액과 실제 청구 금액은 같습니다.</li>
          <li>신용카드 등 전자결제는 토스페이먼츠를 통해 처리합니다.</li>
          <li>결제가 끝나면 상품에 연결된 수강 또는 코칭 권리가 회원에게 생깁니다.</li>
        </ol>

        <h2>4. 청약철회와 환불</h2>
        <p>
          취소와 환불은 <Link href="/legal/refund">취소 및 환불정책</Link>을 따릅니다. 디지털
          콘텐츠의 이용이 시작된 뒤에는 전자상거래법에서 정한 범위에서 청약철회가 제한될 수 있으며,
          그 기준은 환불 정책과 상품 안내에 밝힙니다.
        </p>

        <h2>5. 회원의 이용</h2>
        <ol>
          <li>수강 영상, 자료, 코칭 내용은 해당 회원만 이용합니다. 복제, 공유, 재판매를 하지 않습니다.</li>
          <li>코칭은 발행된 회차와 안내된 기간 안에서 이용합니다.</li>
          <li>커뮤니티와 체크인에는 다른 사람의 권리를 해치거나 서비스 운영을 방해하는 내용을 올리지 않습니다.</li>
        </ol>

        <h2>6. 중단과 탈퇴</h2>
        <p>
          회원은 언제든 탈퇴를 요청할 수 있습니다. 회사는 약관이나 법령을 위반한 이용을 제한할 수
          있습니다. 이미 제공한 수강과 발행된 코칭의 환불은 환불 정책을 따릅니다.
        </p>

        <h2>7. 책임</h2>
        <p>
          회사는 관련 법령과 이 약관에서 정한 범위에서 서비스를 제공합니다. 회원 계정 관리 소홀,
          회원이 올린 내용, 통신 장애 등 회사의 합리적 통제 밖의 사유로 생긴 손해에 대해서는 법령이
          정한 경우를 제외하고 책임을 지지 않습니다.
        </p>

        <h2>8. 약관의 변경</h2>
        <p>
          회사는 약관을 바꿀 수 있습니다. 회원에게 불리한 변경은 적용일 7일 전에 서비스 안에
          공지합니다. 변경에 동의하지 않으면 탈퇴할 수 있습니다.
        </p>

        <h2>9. 분쟁</h2>
        <p>
          이 약관은 대한민국 법령을 따릅니다. 분쟁은 민사소송법이 정한 관할 법원에 제기합니다.
        </p>

        <h2>10. 회사 정보</h2>
        <ul>
          <li>상호 {siteBusiness.name}</li>
          <li>대표자 {siteBusiness.representative}</li>
          <li>사업자등록번호 {siteBusiness.registrationNumber}</li>
          <li>사업장 주소 {siteBusiness.address}</li>
          <li>유선번호 {siteBusiness.phone}</li>
          <li>
            이메일 <a href={`mailto:${siteBusiness.supportEmail}`}>{siteBusiness.supportEmail}</a>
          </li>
        </ul>
      </div>
    </div>
  );
}
