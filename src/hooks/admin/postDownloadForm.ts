import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import StyledToast from "@/components/ui/toast-styled";
import { ApiErrorResponse } from "./postReviewedHandler";

export default function useDownloadForm(scholarshipId: number | undefined) {
  const mutation = useMutation({
    mutationFn: async (path: string) => {
      if (!scholarshipId) throw new Error("Application ID is required.");

      StyledToast({
        status: "checking",
        title: "Please wait...",
        description: "Downloading your requested file.",
      });

      const url = `${process.env.NEXT_PUBLIC_USER_URL}/downloadScholarshipForm`;
      const response = await axios.post(
        url,
        { scholarshipId, path }, // ⬅️ send data in body
        {
          withCredentials: true,
          responseType: "blob", // ⬅️ important for file downloading
        },
      );

      // Detect file type and name
      const contentDisposition = response.headers["content-disposition"];
      const contentType = response.headers["content-type"];
      const fileExtension =
        (typeof contentType === "string" ? contentType : "").split("/")[1] ||
        "bin";
      const fileName =
        contentDisposition?.split("filename=")[1]?.replace(/"/g, "") ||
        `document.${fileExtension}`;

      // Create a download link for the file
      const blob = new Blob([response.data], {
        type: typeof contentType === "string" ? contentType : undefined,
      });
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlBlob;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(urlBlob);

      return response;
    },

    onSuccess: () => {
      StyledToast({
        status: "success",
        title: "Download Successful",
        description: "Your document has been downloaded.",
      });
    },

    onError: (error) => {
      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message;

        if (!error.response) {
          StyledToast({
            status: "error",
            title: "Network Error",
            description:
              "No internet connection or the server is unreachable. Please check your connection and try again.",
          });
        } else if (status === 400) {
          StyledToast({
            status: "error",
            title: "Bad Request",
            description: message ?? "Invalid request. Please check your input.",
          });
        } else if (status === 401) {
          StyledToast({
            status: "error",
            title: "Unauthorized",
            description:
              message ?? "You are not authorized. Please log in again.",
          });
        } else if (status === 403) {
          StyledToast({
            status: "error",
            title: "Forbidden",
            description:
              message ?? "You do not have permission to perform this action.",
          });
        } else if (status === 404) {
          StyledToast({
            status: "warning",
            title: "No data found",
            description: message ?? "There are no records found.",
          });
        } else if (status === 500) {
          StyledToast({
            status: "error",
            title: "Server Error",
            description:
              message ?? "Internal server error. Please try again later.",
          });
        } else {
          StyledToast({
            status: "error",
            title: message ?? "Export CSV error occurred.",
            description: "Cannot process your request.",
          });
        }
      } else {
        StyledToast({
          status: "error",
          title: "Unexpected Error",
          description: "Something went wrong. Please try again later.",
        });
      }
    },
  });

  return {
    onSubmit: mutation.mutate,
    isSuccess: mutation.isSuccess,
    isLoading: mutation.isPending,
  };
}
