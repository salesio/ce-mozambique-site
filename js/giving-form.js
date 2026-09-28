/**
 * Public giving form & modal — frontend-first, wired to giving-bridge.js & Supabase.
 */
const GIVING_MAX_FILE_BYTES = 5 * 1024 * 1024;
const GIVING_ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

const GIVING_CATEGORY_I18N = {
  "Dízimo": "giving.cat.tithe",
  "Construtores de Visão": "giving.cat.visionBuilders",
  "Rapsódia de Realidades": "giving.cat.rhapsody",
  "Loveworld SAT": "giving.cat.lwsat",
  "Missões de Cidades do Interior": "giving.cat.interiorMissions",
  "Escola de Cura": "giving.cat.healingSchool",
  "Mandato de Célula": "giving.cat.cellMandate",
  "Rapsódias das Crianças": "giving.cat.childrenRhapsody",
  "Projecto da Igreja": "giving.cat.churchProject",
  "Alcançar Moçambique": "giving.cat.reachOut",
  "Primícias": "giving.cat.firstfruits",
  "Semente de Fé": "giving.cat.seedOfFaith",
  "Projectos Locais": "giving.cat.localProjects",
  "Outros": "giving.cat.other"
};

let givingModalOpen = false;

function givingT(key, lang) {
  const selected = translations[lang] ? lang : (document.documentElement.lang || "pt");
  return translations[selected]?.[key] || translations.pt?.[key] || key;
}

function formatGivingMoney(value) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat(document.documentElement.lang === "en" ? "en-MZ" : "pt-MZ", {
    style: "currency",
    currency: "MZN",
    maximumFractionDigits: 0
  }).format(num);
}

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildGivingFormInnerHtml(prefix = "giving") {
  const categories = (window.PUBLIC_GIVING_CATEGORIES || []).map((cat) => {
    const i18nKey = GIVING_CATEGORY_I18N[cat] || cat;
    return `
      <div class="giving-category-row">
        <label data-i18n="${i18nKey}">${cat}</label>
        <input class="form-control" type="number" min="0" step="1" inputmode="numeric"
          name="amount_${cat.replace(/\s+/g, "_")}" data-giving-category="${cat}" placeholder="0">
      </div>`;
  }).join("");

  const churches = (window.getPublicChurchOptions?.() || []).map(
    (c) => `<option value="${c.id}">${c.public_name || c.name}</option>`
  ).join("");

  const methods = (window.PUBLIC_PAYMENT_METHODS || []).map((m) => `<option value="${m}">${m}</option>`).join("");
  const today = getTodayIsoDate();

  return `
    <div id="${prefix}FormAlert" class="giving-form-alert" hidden></div>

    <section class="giving-section">
      <h3 class="giving-section-title"><i class="bi bi-person-vcard"></i><span data-i18n="giving.section.personal">Dados Pessoais</span></h3>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label" for="${prefix}_nome" data-i18n="giving.field.fullName">Nome completo</label>
          <input class="form-control" id="${prefix}_nome" name="nome_completo" type="text" required autocomplete="name" placeholder="Ex: João Manuel Silva">
        </div>
        <div class="col-md-6">
          <label class="form-label" for="${prefix}_birthday" data-i18n="giving.field.birthday">Data de aniversário</label>
          <input class="form-control" id="${prefix}_birthday" name="data_de_aniversario" type="date">
        </div>
        <div class="col-md-6">
          <label class="form-label" for="${prefix}_phone" data-i18n="giving.field.phone">Telefone / WhatsApp</label>
          <input class="form-control" id="${prefix}_phone" name="telefone" type="tel" required autocomplete="tel" placeholder="+258 84/86/87...">
        </div>
        <div class="col-md-6">
          <label class="form-label" for="${prefix}_email" data-i18n="giving.field.email">E-mail</label>
          <input class="form-control" id="${prefix}_email" name="email" type="email" autocomplete="email" placeholder="exemplo@dominio.com">
        </div>
        <div class="col-md-6">
          <label class="form-label" for="${prefix}_church" data-i18n="giving.field.church">Igreja</label>
          <select class="form-select" id="${prefix}_church" name="igreja_id" required>
            <option value="" data-i18n="giving.field.churchPlaceholder">Seleccione a igreja</option>
            ${churches}
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label" for="${prefix}_cell_group" data-i18n="giving.field.cellGroup">Grupo de célula</label>
          <select class="form-select" id="${prefix}_cell_group" name="cell_group_id">
            <option value="" data-i18n="giving.field.cellGroupPlaceholder">Seleccione o grupo de célula</option>
          </select>
        </div>
        <div class="col-12">
          <label class="form-label" for="${prefix}_cell" data-i18n="giving.field.cell">Célula</label>
          <select class="form-select" id="${prefix}_cell" name="cell_id" disabled>
            <option value="" data-i18n="giving.field.cellPlaceholder">Seleccione a célula</option>
          </select>
          <p id="${prefix}CellEmpty" class="giving-file-hint d-none" data-i18n="giving.field.noCells">Nenhuma célula registada neste grupo.</p>
        </div>
      </div>
    </section>

    <section class="giving-section">
      <h3 class="giving-section-title"><i class="bi bi-cash-stack"></i><span data-i18n="giving.section.contributions">Contribuições</span></h3>
      <div class="giving-category-grid">${categories}</div>
      <div class="giving-total-bar">
        <span data-i18n="giving.total">Total Geral</span>
        <strong id="${prefix}GrandTotal">0 MT</strong>
      </div>
      <div id="${prefix}OutrosWrap" class="giving-outros-wrap d-none">
        <label class="form-label mt-2" for="${prefix}_outros_desc" data-i18n="giving.field.otherDesc">Especifique as categorias e montantes das outras doações</label>
        <textarea class="form-control" id="${prefix}_outros_desc" name="outros_descricao" rows="2" placeholder="Descreva os detalhes dos outros valores..."></textarea>
      </div>
    </section>

    <section class="giving-section">
      <h3 class="giving-section-title"><i class="bi bi-receipt"></i><span data-i18n="giving.section.payment">Pagamento / Comprovativo</span></h3>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label" for="${prefix}_method" data-i18n="giving.field.paymentMethod">Método de pagamento</label>
          <select class="form-select" id="${prefix}_method" name="metodo_de_pagamento" required>
            <option value="" data-i18n="giving.field.methodPlaceholder">Seleccione</option>
            ${methods}
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label" for="${prefix}_ref" data-i18n="giving.field.reference">Referência da transacção</label>
          <input class="form-control" id="${prefix}_ref" name="referencia_da_transaccao" type="text" placeholder="Ex: ID M-Pesa / Talão BCI">
        </div>
        <div class="col-md-6">
          <label class="form-label" for="${prefix}_transfer_date" data-i18n="giving.field.transferDate">Data da transferência</label>
          <input class="form-control" id="${prefix}_transfer_date" name="data_da_transferencia" type="date" value="${today}" required>
        </div>
        <div class="col-md-6">
          <label class="form-label" for="${prefix}_pop" data-i18n="giving.field.pop">Anexar comprovativo / POP</label>
          <input class="form-control" id="${prefix}_pop" name="comprovativo_upload" type="file" accept="image/*,.pdf,application/pdf">
          <p class="giving-file-hint" data-i18n="giving.field.fileHint">JPG, PNG, WEBP ou PDF — máx. 5 MB</p>
        </div>
        <div class="col-12">
          <label class="form-label" for="${prefix}_message" data-i18n="giving.field.transferMessage">Colar mensagem da transferência M-Pesa / E-Mola / Conta móvel</label>
          <textarea class="form-control" id="${prefix}_message" name="mensagem_transferencia" rows="3" placeholder="Cole aqui o SMS recebido do M-Pesa / E-Mola..."></textarea>
        </div>
        <div class="col-12">
          <label class="form-label" for="${prefix}_notes" data-i18n="giving.field.notes">Observações</label>
          <textarea class="form-control" id="${prefix}_notes" name="observacoes" rows="2" placeholder="Alguma nota pastoral ou informação adicional..."></textarea>
        </div>
      </div>
    </section>

    <div class="giving-honeypot" aria-hidden="true">
      <label for="${prefix}_website">Website</label>
      <input id="${prefix}_website" name="website" type="text" tabindex="-1" autocomplete="off">
    </div>`;
}

function buildGivingModalMarkup() {
  return `
    <div id="givingModalBackdrop" class="giving-modal-backdrop d-none" aria-hidden="true"></div>
    <aside id="givingModal" class="giving-modal d-none" role="dialog" aria-modal="true" aria-labelledby="givingModalTitle">
      <header class="giving-modal-head">
        <div>
          <span class="eyebrow" data-i18n="giving.eyebrow">Finanças e Parcerias</span>
          <h2 id="givingModalTitle" data-i18n="giving.title">Relatório de Dízimo e Parceria</h2>
        </div>
        <button type="button" class="giving-modal-close" data-giving-close aria-label="Fechar">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </header>
      <form id="givingModalForm" class="d-flex flex-column flex-grow-1 overflow-hidden" novalidate>
        <div class="giving-modal-body">
          ${buildGivingFormInnerHtml("giving")}
        </div>
        <footer class="giving-modal-foot">
          <button type="button" class="btn btn-outline-giving" data-giving-close data-i18n="giving.cancel">Cancelar</button>
          <button type="submit" class="btn btn-ce-gold" data-i18n="giving.submit">Submeter Relatório</button>
        </footer>
      </form>
    </aside>`;
}

function updateFormTotals(form, prefix = "giving") {
  if (!form) return;
  const totalEl = form.querySelector(`#${prefix}GrandTotal`) || document.getElementById(`${prefix}GrandTotal`);
  const outrosWrap = form.querySelector(`#${prefix}OutrosWrap`) || document.getElementById(`${prefix}OutrosWrap`);
  let sum = 0;
  let outros = 0;
  form.querySelectorAll("[data-giving-category]").forEach((input) => {
    const val = Number(input.value) || 0;
    sum += val;
    if (input.dataset.givingCategory === "Outros") outros = val;
  });
  if (totalEl) totalEl.textContent = formatGivingMoney(sum);
  if (outrosWrap) outrosWrap.classList.toggle("d-none", outros <= 0);
}

function showFormAlert(form, message, type = "error", prefix = "giving") {
  const alert = form?.querySelector(`#${prefix}FormAlert`) || document.getElementById(`${prefix}FormAlert`);
  if (!alert) return;
  alert.hidden = false;
  alert.className = type === "success" ? "giving-form-success" : "giving-form-error";
  alert.textContent = message;
  alert.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearFormAlert(form, prefix = "giving") {
  const alert = form?.querySelector(`#${prefix}FormAlert`) || document.getElementById(`${prefix}FormAlert`);
  if (!alert) return;
  alert.hidden = true;
  alert.textContent = "";
}

function refreshChurchSelect(prefix = "giving") {
  const select = document.getElementById(`${prefix}_church`);
  if (!select) return;
  const current = select.value;
  const churches = window.getPublicChurchOptions?.() || [];
  const placeholder = givingT("giving.field.churchPlaceholder", document.documentElement.lang);
  select.innerHTML = `<option value="">${placeholder}</option>${churches.map(
    (c) => `<option value="${c.id}">${c.public_name || c.name}</option>`
  ).join("")}`;
  if (current) select.value = current;
}

function refreshCellGroups(prefix = "giving") {
  const churchId = document.getElementById(`${prefix}_church`)?.value || "";
  const groupSelect = document.getElementById(`${prefix}_cell_group`);
  if (!groupSelect) return;
  const lang = document.documentElement.lang || "pt";
  const options = window.getPublicCellOptions?.(churchId) || { groups: [], cells: [] };
  groupSelect.innerHTML = `<option value="">${givingT("giving.field.cellGroupPlaceholder", lang)}</option>${options.groups.map(
    (group) => `<option value="${group.id}">${group.group_name}</option>`
  ).join("")}`;
  refreshCells(prefix);
}

function refreshCells(prefix = "giving") {
  const churchId = document.getElementById(`${prefix}_church`)?.value || "";
  const groupId = document.getElementById(`${prefix}_cell_group`)?.value || "";
  const cellSelect = document.getElementById(`${prefix}_cell`);
  const empty = document.getElementById(`${prefix}CellEmpty`);
  if (!cellSelect) return;
  const lang = document.documentElement.lang || "pt";
  const options = window.getPublicCellOptions?.(churchId) || { groups: [], cells: [] };
  const cells = options.cells.filter((cell) => cell.group_id === groupId || cell.cell_group_id === groupId);
  cellSelect.innerHTML = `<option value="">${givingT("giving.field.cellPlaceholder", lang)}</option>${cells.map(
    (cell) => `<option value="${cell.id}">${cell.cell_name}</option>`
  ).join("")}`;
  cellSelect.disabled = !groupId;
  empty?.classList.toggle("d-none", !groupId || cells.length > 0);
}

function validateGivingForm(form) {
  const lang = document.documentElement.lang || "pt";
  const data = new FormData(form);

  if (data.get("website")) return givingT("giving.error.spam", lang);

  const nome = String(data.get("nome_completo") || "").trim();
  const telefone = String(data.get("telefone") || "").trim();
  const igrejaId = String(data.get("igreja_id") || "").trim();
  const metodo = String(data.get("metodo_de_pagamento") || "").trim();
  const transferDate = String(data.get("data_da_transferencia") || "").trim();
  const mensagem = String(data.get("mensagem_transferencia") || "").trim();
  const fileInput = form.querySelector("[name='comprovativo_upload']");
  const file = fileInput?.files?.[0];

  if (!nome) return givingT("giving.error.name", lang);
  if (!telefone) return givingT("giving.error.phone", lang);
  if (!igrejaId) return givingT("giving.error.church", lang);

  let total = 0;
  const contribuicoes = [];
  form.querySelectorAll("[data-giving-category]").forEach((input) => {
    const valor = Number(input.value) || 0;
    if (valor > 0) {
      total += valor;
      contribuicoes.push({ categoria: input.dataset.givingCategory, valor });
    }
  });
  if (total <= 0) return givingT("giving.error.amount", lang);

  if (!metodo) return givingT("giving.error.method", lang);
  if (!transferDate) return givingT("giving.error.date", lang);
  if (!file && !mensagem) return givingT("giving.error.proof", lang);

  if (file) {
    if (!GIVING_ALLOWED_FILE_TYPES.includes(file.type) && !/\.(jpe?g|png|webp|gif|pdf)$/i.test(file.name)) {
      return givingT("giving.error.fileType", lang);
    }
    if (file.size > GIVING_MAX_FILE_BYTES) return givingT("giving.error.fileSize", lang);
  }

  const outrosLine = contribuicoes.find((line) => line.categoria === "Outros");
  if (outrosLine && !String(data.get("outros_descricao") || "").trim()) {
    return givingT("giving.error.otherDesc", lang);
  }

  return null;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function buildGivingSubmission(form) {
  const data = new FormData(form);
  const churches = window.getPublicChurchOptions?.() || [];
  const churchId = String(data.get("igreja_id") || "");
  const church = churches.find((c) => c.id === churchId);
  const contribuicoes = [];
  let total = 0;

  form.querySelectorAll("[data-giving-category]").forEach((input) => {
    const valor = Number(input.value) || 0;
    if (valor > 0) {
      total += valor;
      contribuicoes.push({ categoria: input.dataset.givingCategory, valor });
    }
  });

  const fileInput = form.querySelector("[name='comprovativo_upload']");
  const file = fileInput?.files?.[0];
  let comprovativo_url = "";
  const useSupabase = window.CESupabaseGiving?.isConfigured?.();
  if (file && !useSupabase) comprovativo_url = await readFileAsDataUrl(file);

  const groupId = `sg-${Date.now()}`;
  const cellOptions = window.getPublicCellOptions?.(churchId) || { groups: [], cells: [] };
  const cellGroupId = String(data.get("cell_group_id") || "");
  const cellId = String(data.get("cell_id") || "");
  const selectedGroup = cellOptions.groups.find((group) => group.id === cellGroupId);
  const selectedCell = cellOptions.cells.find((cell) => cell.id === cellId);

  return {
    id: `pgs-${Date.now()}`,
    submission_group_id: groupId,
    nome_completo: String(data.get("nome_completo") || "").trim(),
    data_de_aniversario: String(data.get("data_de_aniversario") || ""),
    telefone: String(data.get("telefone") || "").trim(),
    email: String(data.get("email") || "").trim(),
    igreja_id: churchId,
    igreja_nome: church?.public_name || church?.name || "",
    cell_group_id: cellGroupId,
    cell_group_name: selectedGroup?.group_name || "",
    grupo_de_celula: selectedGroup?.group_name || "",
    cell_id: cellId,
    cell_name: selectedCell?.cell_name || "",
    celula: selectedCell?.cell_name || "",
    contribuicoes,
    outros_descricao: String(data.get("outros_descricao") || "").trim(),
    metodo_de_pagamento: String(data.get("metodo_de_pagamento") || ""),
    referencia_da_transaccao: String(data.get("referencia_da_transaccao") || "").trim(),
    data_da_transferencia: String(data.get("data_da_transferencia") || getTodayIsoDate()),
    comprovativo_url,
    mensagem_transferencia: String(data.get("mensagem_transferencia") || "").trim(),
    observacoes: String(data.get("observacoes") || "").trim(),
    total_geral: total,
    source: "public_website",
    status: "Pendente de Verificação",
    created_at: new Date().toISOString()
  };
}

function renderReceiptCard(container, submission) {
  const lang = document.documentElement.lang || "pt";
  const refCode = submission.submission_group_id ? submission.submission_group_id.toUpperCase() : `CE-REF-${Date.now()}`;
  const totalFormatted = formatGivingMoney(submission.total_geral);

  const lines = (submission.contribuicoes || []).map((c) => {
    const label = givingT(GIVING_CATEGORY_I18N[c.categoria] || c.categoria, lang);
    return `<tr><td>${label}</td><td class="text-end fw-bold">${formatGivingMoney(c.valor)}</td></tr>`;
  }).join("");

  const churchLabel = submission.cell_name 
    ? `${submission.igreja_nome} (${submission.cell_name})`
    : (submission.igreja_nome || "Christ Embassy");

  const waText = encodeURIComponent(
    `*Relatório de Dízimo e Parceria — Christ Embassy Mozambique*\n` +
    `Ref: ${refCode}\n` +
    `Nome: ${submission.nome_completo}\n` +
    `Igreja: ${churchLabel}\n` +
    `Método: ${submission.metodo_de_pagamento}\n` +
    `Total: ${totalFormatted}\n` +
    `Data: ${submission.data_da_transferencia}\n` +
    `Agradecemos pela fidelidade e parceria no Evangelho!`
  );

  container.innerHTML = `
    <div class="giving-receipt-card">
      <div class="giving-receipt-icon">
        <i class="bi bi-check-lg" aria-hidden="true"></i>
      </div>
      <h2 class="h3 mb-2" data-i18n="giving.receipt.title">${givingT("giving.receipt.title", lang)}</h2>
      <p class="text-ce-muted mb-3" data-i18n="giving.receipt.lead">${givingT("giving.receipt.lead", lang)}</p>
      
      <div class="giving-receipt-ref-badge">
        <span data-i18n="giving.receipt.ref">${givingT("giving.receipt.ref", lang)}:</span> <strong>${refCode}</strong>
      </div>

      <table class="giving-receipt-table">
        <tbody>
          <tr><td data-i18n="giving.receipt.donor">${givingT("giving.receipt.donor", lang)}</td><td class="text-end fw-semibold">${submission.nome_completo}</td></tr>
          <tr><td data-i18n="giving.receipt.church">${givingT("giving.receipt.church", lang)}</td><td class="text-end">${churchLabel}</td></tr>
          <tr><td data-i18n="giving.receipt.method">${givingT("giving.receipt.method", lang)}</td><td class="text-end">${submission.metodo_de_pagamento}</td></tr>
          <tr><td data-i18n="giving.receipt.date">${givingT("giving.receipt.date", lang)}</td><td class="text-end">${submission.data_da_transferencia}</td></tr>
          ${lines}
          <tr class="total-row"><td data-i18n="giving.receipt.total">${givingT("giving.receipt.total", lang)}</td><td class="text-end">${totalFormatted}</td></tr>
        </tbody>
      </table>

      <div class="giving-receipt-actions">
        <a class="btn btn-whatsapp btn-lg" href="https://api.whatsapp.com/send?text=${waText}" target="_blank" rel="noopener">
          <i class="bi bi-whatsapp"></i> <span data-i18n="giving.receipt.whatsapp">${givingT("giving.receipt.whatsapp", lang)}</span>
        </a>
        <button type="button" class="btn btn-outline-light btn-lg" id="btnNewGivingReport" data-i18n="giving.receipt.new">
          ${givingT("giving.receipt.new", lang)}
        </button>
      </div>
    </div>`;

  document.getElementById("btnNewGivingReport")?.addEventListener("click", () => {
    initStandaloneGivingPage(container);
  });
}

function initStandaloneGivingPage(container) {
  if (!container) return;
  const prefix = "pageGiving";

  container.innerHTML = `
    <form id="givingPageForm" novalidate>
      ${buildGivingFormInnerHtml(prefix)}
      <div class="d-flex flex-column flex-sm-row justify-content-end gap-3 mt-4 pt-3 border-top border-secondary border-opacity-25">
        <button type="submit" class="btn btn-ce-gold btn-lg w-100 w-sm-auto" data-i18n="giving.submit">
          Submeter Relatório
        </button>
      </div>
    </form>`;

  const form = document.getElementById("givingPageForm");
  refreshChurchSelect(prefix);
  refreshCellGroups(prefix);
  updateFormTotals(form, prefix);

  form?.addEventListener("input", (event) => {
    if (event.target.matches("[data-giving-category]")) updateFormTotals(form, prefix);
  });

  form?.addEventListener("change", (event) => {
    if (event.target.id === `${prefix}_church`) refreshCellGroups(prefix);
    if (event.target.id === `${prefix}_cell_group`) refreshCells(prefix);
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormAlert(form, prefix);
    const lang = document.documentElement.lang || "pt";
    const error = validateGivingForm(form);
    if (error) {
      showFormAlert(form, error, "error", prefix);
      return;
    }

    const submitBtn = form.querySelector("[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>A processar...`;
    }

    try {
      const submission = await buildGivingSubmission(form);
      const proofFile = form.querySelector("[name='comprovativo_upload']")?.files?.[0] || null;
      let saved = false;

      if (typeof window.submitPublicGivingViaSupabase === "function" && window.CESupabaseGiving?.isConfigured?.()) {
        const result = await window.submitPublicGivingViaSupabase(submission, proofFile);
        saved = Boolean(result?.ok);
      }

      if (!saved && typeof window.enqueuePublicGivingSubmission === "function") {
        window.enqueuePublicGivingSubmission(submission);
        saved = true;
      }

      if (!saved) throw new Error("No submission handler available");

      renderReceiptCard(container, submission);
    } catch {
      showFormAlert(form, givingT("giving.error.generic", lang), "error", prefix);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = givingT("giving.submit", lang);
      }
    }
  });
}

function initGivingShareCard() {
  const btnCopy = document.getElementById("btnCopyGivingLink");
  const btnWa = document.getElementById("btnShareGivingWhatsApp");
  const toastMsg = document.getElementById("givingShareToast");

  const currentUrl = window.location.href.split("#")[0].split("?")[0];

  if (btnCopy) {
    btnCopy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(currentUrl);
        if (toastMsg) {
          toastMsg.classList.remove("d-none");
          setTimeout(() => toastMsg.classList.add("d-none"), 3500);
        }
      } catch {
        const temp = document.createElement("input");
        temp.value = currentUrl;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
        if (toastMsg) {
          toastMsg.classList.remove("d-none");
          setTimeout(() => toastMsg.classList.add("d-none"), 3500);
        }
      }
    });
  }

  if (btnWa) {
    const shareText = encodeURIComponent(
      `Paz do Senhor irmãos!\n` +
      `Aqui está o link para preencher o *Relatório de Dízimo e Parceria* da Christ Embassy Moçambique:\n` +
      `${currentUrl}\n` +
      `Deus abençoe a sua semente!`
    );
    btnWa.setAttribute("href", `https://api.whatsapp.com/send?text=${shareText}`);
  }
}

function openGivingModal() {
  const backdrop = document.getElementById("givingModalBackdrop");
  const modal = document.getElementById("givingModal");
  const form = document.getElementById("givingModalForm");
  if (!backdrop || !modal) return;
  clearFormAlert(form, "giving");
  form?.reset();
  const dateInput = form?.querySelector("[name='data_da_transferencia']");
  if (dateInput) dateInput.value = getTodayIsoDate();
  refreshCellGroups("giving");
  updateFormTotals(form, "giving");
  backdrop.classList.remove("d-none");
  modal.classList.remove("d-none");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    backdrop.classList.add("is-open");
    modal.classList.add("is-open");
  });
  givingModalOpen = true;
  modal.querySelector("[name='nome_completo']")?.focus();
}

function closeGivingModal() {
  const backdrop = document.getElementById("givingModalBackdrop");
  const modal = document.getElementById("givingModal");
  if (!backdrop || !modal) return;
  backdrop.classList.remove("is-open");
  modal.classList.remove("is-open");
  document.body.style.overflow = "";
  givingModalOpen = false;
  setTimeout(() => {
    backdrop.classList.add("d-none");
    modal.classList.add("d-none");
  }, 280);
}

function initGivingModal() {
  // Check if we are on standalone page
  const standaloneContainer = document.getElementById("givingStandaloneContainer");
  if (standaloneContainer) {
    initStandaloneGivingPage(standaloneContainer);
    initGivingShareCard();
  }

  // Modal initialization for pages with trigger buttons
  if (!document.getElementById("givingModal")) {
    document.body.insertAdjacentHTML("beforeend", buildGivingModalMarkup());
  }

  const form = document.getElementById("givingModalForm");
  const backdrop = document.getElementById("givingModalBackdrop");
  refreshChurchSelect("giving");
  refreshCellGroups("giving");

  document.querySelectorAll("[data-open-giving-modal]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      openGivingModal();
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-giving-close]")) {
      event.preventDefault();
      closeGivingModal();
      return;
    }
    if (givingModalOpen && event.target === backdrop) closeGivingModal();
  });

  document.addEventListener("keydown", (event) => {
    if (givingModalOpen && event.key === "Escape") closeGivingModal();
  });

  form?.addEventListener("input", (event) => {
    if (event.target.matches("[data-giving-category]")) updateFormTotals(form, "giving");
  });

  form?.addEventListener("change", (event) => {
    if (event.target.id === "giving_church") refreshCellGroups("giving");
    if (event.target.id === "giving_cell_group") refreshCells("giving");
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormAlert(form, "giving");
    const lang = document.documentElement.lang || "pt";
    const error = validateGivingForm(form);
    if (error) {
      showFormAlert(form, error, "error", "giving");
      return;
    }

    const submitBtn = form.querySelector("[type='submit']");
    if (submitBtn) submitBtn.disabled = true;

    try {
      const submission = await buildGivingSubmission(form);
      const proofFile = form.querySelector("[name='comprovativo_upload']")?.files?.[0] || null;
      let saved = false;

      if (typeof window.submitPublicGivingViaSupabase === "function" && window.CESupabaseGiving?.isConfigured?.()) {
        const result = await window.submitPublicGivingViaSupabase(submission, proofFile);
        saved = Boolean(result?.ok);
      }

      if (!saved && typeof window.enqueuePublicGivingSubmission === "function") {
        window.enqueuePublicGivingSubmission(submission);
        saved = true;
      }

      if (!saved) throw new Error("No submission handler available");

      showFormAlert(form, givingT("giving.success", lang), "success", "giving");
      form.reset();
      refreshCellGroups("giving");
      updateFormTotals(form, "giving");
      setTimeout(closeGivingModal, 2200);
    } catch {
      showFormAlert(form, givingT("giving.error.generic", lang), "error", "giving");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  const observer = new MutationObserver(() => {
    if (document.documentElement.lang) {
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        const value = givingT(key, document.documentElement.lang);
        if (value) {
          if (el.tagName === "OPTION" && !el.value) el.textContent = value;
          else if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") el.textContent = value;
        }
      });
      refreshChurchSelect("giving");
      refreshCellGroups("giving");
      refreshChurchSelect("pageGiving");
      refreshCellGroups("pageGiving");
      if (form) updateFormTotals(form, "giving");
      const pageForm = document.getElementById("givingPageForm");
      if (pageForm) updateFormTotals(pageForm, "pageGiving");
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
}

window.initGivingModal = initGivingModal;
window.openGivingModal = openGivingModal;
window.initStandaloneGivingPage = initStandaloneGivingPage;
