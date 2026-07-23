import { useMutation, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const useUpdateUserProfile = (authUser) => {
    
    const navigate = useNavigate();
    const queryClient = useQueryClient();

  const {mutateAsync: updateProfile, isPending: isUpdatingProfile} = useMutation({
		mutationFn: async (formData) => {
			try {
				const res = await fetch("/api/user/update", {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: JSON.stringify(formData)
				});
				const data = await res.json();

				if(!res.ok) throw new Error(data.error || "Something went wrong");
				return data;
			} catch (error) {
				throw error;
			}
		},
		onSuccess: async (updatedUser) => {
            
            if (authUser.username !== updatedUser.username) {
                navigate(`/profile/${updatedUser.username}`);
			}
            
			await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["authUser"] }),
                queryClient.invalidateQueries({ queryKey: ["userProfile", authUser.username] }),
                queryClient.invalidateQueries({ queryKey: ["userProfile", updatedUser.username] }),
            ]);
            document.getElementById("edit_profile_modal")?.close();
            toast.success("Profile updated successfully");
		},
		onError: (error) => {
			toast.error(error.message);
		}
	});
    return {updateProfile, isUpdatingProfile}
}

export default useUpdateUserProfile