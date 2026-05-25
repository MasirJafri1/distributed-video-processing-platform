const processVideoJob = async (job) => {
  console.log("Processing video job:");

  console.log(job);

  await new Promise((resolve) =>
    setTimeout(resolve, 5000)
  );

  console.log("Video processing completed");
};

module.exports = {
  processVideoJob
};