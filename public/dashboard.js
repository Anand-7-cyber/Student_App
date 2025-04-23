// function showProfile() {
//     fetch('/user-info')
//       .then(res => res.json())
//       .then(data => {
//         document.getElementById('profile-name').textContent = data.name;
//         document.getElementById('profile-email').textContent = data.email;
//         document.getElementById('profile-popup').style.display = 'flex';
//       });
//   }

//   function closeProfile() {
//     document.getElementById('profile-popup').style.display = 'none';
//   }


  
//         // Function to toggle sidebar visibility
//         function toggleSidebar() {
//             const sidebar = document.getElementById('sidebar');
//             if (sidebar.style.transform === 'translateX(0px)') {
//                 sidebar.style.transform = 'translateX(-250px)';
//                 document.querySelector('.main-content').style.marginLeft = '0';
//             } else {
//                 sidebar.style.transform = 'translateX(0)';
//                 document.querySelector('.main-content').style.marginLeft = '250px';
//             }
//         }

// Function to show user profile
function showProfile() {
  fetch('/user-info')
    .then(res => res.json())
    .then(data => {
      document.getElementById('profile-name').textContent = data.name;
      document.getElementById('profile-email').textContent = data.email;

      const popup = document.getElementById('profile-popup');
      popup.classList.add('show'); // Add 'show' class to display popup with smooth transition
      popup.style.display = 'flex'; // Ensure the popup is visible
    });
}

// Function to close user profile
function closeProfile() {
  const popup = document.getElementById('profile-popup');
  popup.classList.remove('show'); // Remove 'show' class to hide popup with smooth transition
  setTimeout(() => popup.style.display = 'none', 300); // Hide after transition
}

// Function to toggle sidebar visibility
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.querySelector('.main-content');

  // Check the current state and toggle the sidebar
  if (sidebar.classList.contains('active')) {
    sidebar.classList.remove('active');
    mainContent.style.marginLeft = '0'; // Reset content margin when sidebar closes
  } else {
    sidebar.classList.add('active');
    mainContent.style.marginLeft = '250px'; // Move content to the right when sidebar opens
  }
}







function openSidebar() {
  document.getElementById("sidebar").classList.add("active");
  document.getElementById("hamburger").style.display = "none";
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("active");
  document.getElementById("hamburger").style.display = "block";
}




