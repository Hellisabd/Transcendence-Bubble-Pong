/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
	  "./Frontend/templates/**/*.ejs",
	  "./Frontend/ts/**/*.js",
	  "./Frontend/ts/**/*.ts",
	  "./Frontend/css/**/*.css",
	  "./Frontend/css/**/*.js",
	],
	theme: {
	  extend: {
		screens: {
			xs: '340px',
		  },
		fontFamily: {
			mainFont: ['"Oxanium"', 'sans-serif'],
			secondFont: ['"Press Start 2P"', 'system-ui'],
		},
		keyframes:{
			fadeIn: {
				'0%': { opacity: '0', transform: 'translateY(20px)' },
				'90%': { opacity: '1', transform: 'translateY(3px)' },
				'100%': { opacity: '1', transform: 'translateY(0)' },
			},
			loop: {
				'0%': { transform: 'rotate(0deg)' },
				'25%': { transform: 'rotate(360deg)' },
				'50%': { transform: 'rotate(0deg)' },
				'100%': { transform: 'rotate(0deg)' },
			},
			leftFadeIn: {
				'0%': { opacity: '0', transform: 'translateX(-2.5rem)' },
				'90%': { opacity: '1', transform: 'translateX(-0.37rem)' },
				'100%': { opacity: '1', transform: 'translateX(0)' },
			},
			rightFadeIn: {
				'0%': { opacity: '0', transform: 'translateX(2.5rem)' },
				'90%': { opacity: '1', transform: 'translateX(0.37rem)' },
				'100%': { opacity: '1', transform: 'translateX(0)' },
			},
		},
		animation: {
		  fadeIn: 'fadeIn 0.5s ease-out',
		  fadeInThenLoop: 'fadeIn 0.5s ease-out, loop 3s linear 1s ease-out',
		  leftFadeIn: 'leftFadeIn 0.5s ease-out',
		  rightFadeIn: 'rightFadeIn 0.5s ease-out',
		},
	  },
	},
	plugins: [],
  }