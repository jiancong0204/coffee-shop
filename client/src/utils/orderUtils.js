// 格式化订单项目显示，包括细分选项
export const formatOrderItems = async (items, variantTypes) => {
  if (!items || items.length === 0) return '无商品信息';
  
  const formattedItems = [];
  
  for (const item of items) {
    let itemText = `${item.name} x${item.quantity}`;
    
    // 如果有细分选项，格式化显示
    if (item.variant_selections && variantTypes) {
      const variantTexts = [];
      
      for (const [typeId, optionId] of Object.entries(item.variant_selections)) {
        const variantType = variantTypes.find(vt => vt.id == typeId);
        if (variantType) {
          const option = variantType.options.find(opt => opt.id == optionId);
          if (option) {
            variantTexts.push(`${variantType.display_name}:${option.display_name}`);
          }
        }
      }
      
      if (variantTexts.length > 0) {
        itemText += ` (${variantTexts.join(', ')})`;
      }
    }
    
    formattedItems.push(itemText);
  }
  
  return formattedItems.join(', ');
};

// 简化版本，用于显示基本的商品信息
export const formatBasicOrderItems = (items) => {
  if (!items || items.length === 0) return '无商品信息';
  
  return items.map(item => `${item.name} x${item.quantity}`).join(', ');
}; 