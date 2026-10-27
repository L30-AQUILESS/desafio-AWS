// Valida os dados de um pacote (o campo "detail" do evento).
// Devolve uma lista de erros: lista vazia significa pacote válido.
function validatePackage(detail) {
  // Sem dados, não há o que validar
  if (!detail) return ['detail ausente'];

  const errors = [];

  for (const field of ['packageId', 'customerId', 'warehouseId']) {
    if (!detail[field]) errors.push(`campo obrigatório ausente: ${field}`);
  }
  // A lista de itens precisa existir e não pode estar vazia (caso do PKG-1002)
  if (!Array.isArray(detail.items) || detail.items.length === 0) {
    errors.push('lista de itens vazia');
  } else {
    detail.items.forEach((item, i) => {
      if (!item.sku) errors.push(`item ${i}: sku ausente`);
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        errors.push(`item ${i}: quantidade inválida`);
      }
    });
  }

  return errors;
}

module.exports = { validatePackage };