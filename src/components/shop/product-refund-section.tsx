const SUPPORT_EMAIL = "support@glia.kr";

const REFUND_ROWS = [
  ["클래스 오픈 전", "전체환불 (구독권은 당월 결제건 환불불가)"],
  ["1주차 클래스 오픈 후", "수강료 4/5환불 - 해지 위약금 10%"],
  ["2주차 클래스 오픈 후", "수강료 3/4환불 - 해지 위약금 10%"],
  ["3주차 클래스 오픈 후", "수강료 2/3환불 - 해지 위약금 10%"],
  ["4주차 클래스 오픈 후", "수강료 1/2 환불 - 해지 위약금 10%"],
  ["5주차 클래스 오픈 후 (클래스의 1/2이상 오픈 후)", "반환하지않음"],
] as const;

export function ProductRefundSection() {
  return (
    <section id="pdp-refund" className="glia-pdp__section" aria-labelledby="pdp-refund-heading">
      <div className="glia-pdp__refund-head">
        <h2 id="pdp-refund-heading" className="glia-pdp__section-title">
          취소 및 환불정책
        </h2>
        <p className="glia-pdp__refund-date">시행일자: 2026. 10. 01.</p>
      </div>

      <div className="glia-pdp__refund">
        <p>
          환불은{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="glia-pdp__refund-link">
            {SUPPORT_EMAIL}
          </a>
          로 신청이 가능합니다. 서비스 이용 전 꼭 확인 부탁드립니다.
        </p>

        <div className="glia-pdp__refund-rules">
          <p>* 환불준수사항</p>
          <ol>
            <li value={1}>
              GLIA의 프로그램 신청 시, 해당 환불 규정과 이용 약관에 동의한 것으로 간주합니다.
            </li>
            <li>처음으로 취소/환불을 요구한 시점을 기준으로 반환됩니다.</li>
            <li>환불확정 및 처리가 완료되면 클래스 수강은 즉시종료되며, 철회가 불가능합니다.</li>
            <li>
              수강유무와 관계없이, 각 클래스의 시작일부터 수강이 시작 및 서비스가 제공되며 클래스가
              오픈된 후에는 전액환불이 불가능합니다.
            </li>
            <li value={6}>
              수강 신청 시 잘못된 연락처(전화번호, 이메일), 이름 등을 기재로 인한 안내 실패 및
              환불안내에 대한 대응 지연 및 미숙지로 인한 손해 및 불이익에 대해서는 수강신청자의
              과실로 당사에서 책임지지 않습니다.
            </li>
            <li>
              회사는 회원이 관계 법령, 결제 전 유의사항 또는 계정공유 등 이용약관 등을 위반한 경우
              이용약관 및 정책에 따라 환불을 거부할 수 있습니다.
            </li>
            <li>환불신청방법은 본 안내 가장 하단에 안내되어있습니다.</li>
          </ol>
        </div>

        <h3>1. 클래스 수강권</h3>
        <div className="glia-pdp__refund-table-wrap">
          <table className="glia-pdp__refund-table">
            <thead>
              <tr>
                <th scope="col" colSpan={2}>
                  기준
                </th>
                <th scope="col">환불금액</th>
              </tr>
            </thead>
            <tbody>
              {REFUND_ROWS.map(([when, amount], index) => (
                <tr key={when}>
                  {index === 0 ? (
                    <th scope="rowgroup" rowSpan={REFUND_ROWS.length}>
                      각 클래스 시작일 이후
                    </th>
                  ) : null}
                  <td>{when}</td>
                  <td>{amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="glia-pdp__refund-notes">
          <li>
            수강기간이란 회원에게 유상으로 제공하는 클래스 이용기간으로써 <strong>8주</strong>를
            의미합니다.
            <br />* 단, 클래스에 따라 <strong>8주 (56일)</strong> 이상의 수강기간이 제공될 수 있으며,{" "}
            <strong>8주</strong>를 초과하는 기간은 서비스기간 혹은 천재지변과 예상치못한 오류등을
            대비하여 설정되는 임시기간입니다.
            <br />* <strong>8주 이하의 특강</strong>의 경우 시작일 이후부터 모든 스케줄표가
            오픈되기 때문에, 시작일 이후부터는 환불이 불가능합니다.
          </li>
          <li>시청 여부와 관계없이, 클래스 공개유무에 따라 금액이 환산되어 차감됩니다.</li>
          <li>
            클래스오픈은 안내된 일정에 맞게 일요일에서 월요일로 넘어가는 자정에 오픈됩니다. 즉 매주
            월요일 00:00 이후부터는 해당주간의 클래스가 오픈된 환불규정이 적용됩니다.
          </li>
          <li>
            환불사유를 밝힌 다음날부터 반올림하여 계산하여 환불되며, 환불이 접수된 이후에는
            해당클래스 수강, 혹은 환불철회가 어렵습니다.
          </li>
          <li>
            클래스 시작(오픈)일은 클래스 상세페이지, 스케줄표에 명시된 수강시작일부터 시작되며,
            해당일자로부터 1일로 계산됩니다.
          </li>
          <li>
            수강은 총 클래스영상 수 중 이용한 영상 수의 비율, 경과된 수강기간을 의미합니다. 단,
            클래스영상 일부 재생 시에도 이용으로 간주합니다.
          </li>
          <li>
            <strong className="glia-pdp__refund-em">
              환불요청일 기준 클래스 오픈정도와 수강진도(수강한 챕터 수) 중 높은 값을 적용하여
              환불금액을 산정
            </strong>
            합니다.
          </li>
          <li>
            회원이 클래스와 함께 제공되는 자료 또는 정보를 다운로드하는 경우 해당 자료 또는 정보가
            포함된 클래스영상을 이용한 것으로 간주합니다.
          </li>
          <li>
            정기 구독권의 경우 이미 결제된 구독권은 환불되지 않으며, 다음 달 구독권부터 취소됩니다.
          </li>
          <li>
            회사가 서비스로 제공한 수강기간의 경우 <strong>환불이 불가합니다</strong>.
          </li>
        </ul>

        <h3>2. 기타사항</h3>
        <ul className="glia-pdp__refund-notes">
          <li>
            회사가 마케팅, 이벤트 등과 관련하여 무상으로 부여하는 추가 이용기간(보너스기간)은 환불에
            영향을 미치지 아니합니다.
          </li>
          <li>
            회사가 이벤트 등과 관련하여 클래스와 함께 제공한 제품의 경우, 클래스 환불시 제품금액과
            배송료(3000원)를 제외한 금액이 환불되게됩니다.
          </li>
          <li>회사는 환불 시 금융거래수수료, 제세공과금 등을 공제할 수 있습니다.</li>
          <li>
            회사는 회원이 관계 법령, 결제 전 유의사항 또는 이용약관 등을 위반한 경우 이용약관 및
            정책에 따라 환불을 거부할 수 있습니다.
          </li>
          <li>
            회사가 정한 수강규정을 위반할 경우 (자료 공유, 계정의 공유)시 해당클래스는 즉시종료되며
            환불이 불가합니다.
          </li>
        </ul>

        <h3>3. 환불신청방법과 환불절차</h3>
        <p>
          환불을 원하시는 경우{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="glia-pdp__refund-link">
            {SUPPORT_EMAIL}
          </a>
          로 아래 양식에 맞추어 보내 주세요. 내부에서 확인 후 최종환불금액에 대한 답변을 드리며,
          환불확정에 동의하시면 2영업일 내에 환불이 진행됩니다. (무통장 입금의 경우 입금을 통한 환불
          / 카드결제의 경우 카드 부분취소처리로 이루어집니다)
        </p>
        <ol className="glia-pdp__refund-form">
          <li>환불을 원하시는 클래스</li>
          <li>현재 클래스의 오픈주차에 대한 환불금액을 확인하셨나요?</li>
          <li>취소 사유</li>
          <li>(무통장 입금으로 신청하셨을 경우만 꼭 기입해주세요) 환불받으실 계좌와 입금자명</li>
        </ol>
      </div>
    </section>
  );
}
