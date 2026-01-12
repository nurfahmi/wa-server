
export const parseLabels = (labelsJson) => {
  try {
    if (!labelsJson) return [];
    return typeof labelsJson === 'string' ? JSON.parse(labelsJson) : labelsJson;
  } catch (e) {
    return [];
  }
};

export const formatJid = (jid) => {
  if (!jid) return "";
  return jid.split("@")[0];
};
