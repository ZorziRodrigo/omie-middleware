function onlyDigits(s) {
  return (s || '').toString().replace(/\D/g, '');
}

function isCpf(doc) {
  return onlyDigits(doc).length === 11;
}

function isCnpj(doc) {
  return onlyDigits(doc).length === 14;
}

// Segmento conforme sua regra:
// - CNPJ => B2B
// - CPF  => B2C
// - vazio => B2C (padrão PDV sem identificação)
function classifySegment(doc) {
  if (isCnpj(doc)) return 'B2B';
  return 'B2C';
}

module.exports = { onlyDigits, isCpf, isCnpj, classifySegment };
