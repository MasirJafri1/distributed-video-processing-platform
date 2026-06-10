export async function getVideo(id) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/videos/${id}`,
  );
  return response.json();
}
