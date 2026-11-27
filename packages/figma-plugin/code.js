figma.showUI(__html__, { width: 400, height: 280 });
figma.ui.onmessage = async message => {
  try {
    const data = message.data;
    if (!data || data.collection !== 'INTEIRO' || !Array.isArray(data.variables) || !Array.isArray(data.modes)) throw new Error('Arquivo INTEIRO inválido.');
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    let collection = collections.find(c => c.name === data.collection);
    if (!collection) collection = figma.variables.createVariableCollection(data.collection);
    const variables = await figma.variables.getLocalVariablesAsync();
    for (const [index, name] of data.modes.entries()) {
      let mode = collection.modes.find(m => m.name === name);
      if (!mode && index === 0 && collection.modes.length === 1 && collection.modes[0].name === 'Mode 1') { collection.renameMode(collection.defaultModeId, name); mode = collection.modes[0]; }
      const modeId = mode?.modeId ?? collection.addMode(name);
      for (const item of data.variables) {
        let variable = variables.find(v => v.variableCollectionId === collection.id && v.name === item.name);
        if (variable && variable.resolvedType !== item.resolvedType) throw new Error(`Tipo incompatível: ${item.name}`);
        if (!variable) { variable = figma.variables.createVariable(item.name, collection, item.resolvedType); variables.push(variable); }
        variable.description = item.description;
        variable.setValueForMode(modeId, item.valuesByMode[name]);
      }
    }
    figma.ui.postMessage({ ok: true, message: `${data.variables.length} variáveis atualizadas.` });
  } catch (error) { figma.ui.postMessage({ ok: false, message: String(error) }); }
};
