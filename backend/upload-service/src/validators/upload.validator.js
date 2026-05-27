const { z } = require("zod");

const uploadSchema = z.object({

  fileName:
    z.string().min(1),

  contentType:
    z.string().min(1)
});

module.exports = {
  uploadSchema
};