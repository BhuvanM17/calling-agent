const META_CONSTANTS = {
  GRAPH_API_VERSION: "v20.0",
  BASE_URL: "https://graph.facebook.com/v20.0",
  LEAD_ENDPOINT: (leadgenId, token) =>
    `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${token}`,
};

module.exports = META_CONSTANTS;
