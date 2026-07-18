import SignUpPage from "./pages/auth/signup/SignUpPage.jsx";
import { Routes, Route } from "react-router-dom";
import Homepage from "./pages/home/Homepage.jsx";
import LoginPage from "./pages/auth/login/LoginPage.jsx";
import NotificationPage from "./pages/notification/NotificationPage.jsx";
import ProfilePage from "./pages/profile/ProfilePage.jsx";

import Sidebar from "./components/common/sidebar.jsx";
import RightPanel from "./components/common/RightPanel.jsx";

function App() {
	return (
		<div className='flex max-w-6xl mx-auto'>
      <Sidebar/>
			<Routes>
				<Route path='/' element={<Homepage />} />
				<Route path='/signup' element={<SignUpPage />} />
				<Route path='/login' element={<LoginPage />} />
				<Route path='/notifications' element={<NotificationPage />} />
				<Route path='/profile/:username' element={<ProfilePage />} />
			</Routes>
      <RightPanel/>
		  </div>
	);  
}

export default App