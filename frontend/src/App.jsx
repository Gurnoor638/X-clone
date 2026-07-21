import SignUpPage from "./pages/auth/signup/SignUpPage.jsx";
import { Routes, Route, Navigate } from "react-router-dom";
import Homepage from "./pages/home/Homepage.jsx";
import LoginPage from "./pages/auth/login/LoginPage.jsx";
import NotificationPage from "./pages/notification/NotificationPage.jsx";
import ProfilePage from "./pages/profile/ProfilePage.jsx";

import Sidebar from "./components/common/sidebar.jsx";
import RightPanel from "./components/common/RightPanel.jsx";
import { Toaster } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "./components/common/LoadingSpinner.jsx";

function App() {
	
	const { data: authUser, isLoading, error, isError } = useQuery({
		queryKey: ["authUser"],
		queryFn: async () => {
			
			try {
				
				const res = await fetch("/api/auth/me");
				if (res.status === 401) {
        			return null; // User is not logged in
   				}
				// or if(data.error) return null

				const data = await res.json();

				if(!res.ok) throw new Error(data.error || "Something went wrong");
				console.log(data);
				return data;

			} catch (error) {
				throw error;
			}
		},
		retry: false,
	});

	if (isLoading) {
		return (
			<div className='h-screen flex justify-center items-center'>
				<LoadingSpinner size='lg' />
			</div>
		);
	}

	return (
		<div className='flex max-w-6xl mx-auto'>
      {authUser && <Sidebar />}
			<Routes>
				<Route path='/' element={authUser? <Homepage /> : <Navigate to={"/login"}/>} />
				<Route path='/login' element={!authUser? <LoginPage /> :  <Navigate to={"/"}/>}/>
				<Route path='/signup' element={!authUser? <SignUpPage /> :  <Navigate to={"/"}/>} />
				<Route path='/notifications' element={authUser? <NotificationPage /> :  <Navigate to={"/"}/>} />
				<Route path='/profile/:username' element={authUser? <ProfilePage /> :  <Navigate to={"/"}/>} />
			</Routes>
      {authUser && <RightPanel />}
	  <Toaster />
		  </div>
	);  
}

export default App