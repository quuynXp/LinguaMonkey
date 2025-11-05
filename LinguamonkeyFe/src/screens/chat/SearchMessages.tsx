// // Trong màn hình SearchMessages.tsx
// const [keyword, setKeyword] = useState("");
// const { data, isLoading } = useQuery({
//   queryKey: ['searchMessages', roomId, keyword],
//   queryFn: async () => {
//     const response = await instance.get('/api/v1/search/messages', {
//       params: {
//         keyword: keyword,
//         roomId: roomId, // Thêm filter theo phòng
//         page: 0,
//         size: 20
//       }
//     });
//     return response.data.content; // Lấy content từ Page
//   },
//   enabled: keyword.length > 2, // Chỉ tìm khi keyword đủ dài
// });