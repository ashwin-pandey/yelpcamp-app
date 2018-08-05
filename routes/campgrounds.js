var express = require("express");
var router  = express.Router();

var Campground = require("../models/campground");
var Comment = require("../models/comment");
var middleware = require("../middleware");

// Image upload
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'ashwinpandey', 
  api_key: '986321286357784', 
  api_secret: 'cARhYEag9L0Vdkbjn0EqtKMoWL4'
});



// INDEX ROUTE - Show all campgrounds
router.get("/", function(req, res){
    // Get all the campgrounds from DB
    Campground.find({}, function(err, allCampgrounds){
        if (err) {
            console.log(err);
        } else {
            res.render("campgrounds/index", {campgrounds:allCampgrounds, currentUser: req.user, page: 'campgrounds'});
        }
    });
});


// CREATE ROUTE - Add new campground to DB
// router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
//     cloudinary.uploader.upload(req.file.path, function(result) {
//         // add cloudinary url for the image to the campground object under image property
//         req.body.campground.image = result.secure_url;
//         // add author to campground
//         req.body.campground.author = {
//             id: req.user._id,
//             username: req.user.username
//         }
//         Campground.create(req.body.campground, function(err, campground) {
//             if (err) {
//                 req.flash('error', err.message);
//                 return res.redirect('back');
//             }
//             res.redirect('/campgrounds/' + campground.id);
//         });
//     });
    
// });

router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
    cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      // add cloudinary url for the image to the campground object under image property
      req.body.campground.image = result.secure_url;
      // add image's public_id to campground object
      req.body.campground.imageId = result.public_id;
      // add author to campground
      req.body.campground.author = {
        id: req.user._id,
        username: req.user.username
      }
      Campground.create(req.body.campground, function(err, campground) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        res.redirect('/campgrounds/' + campground.id);
      });
    });
});


// NEW ROUTE - Show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
    res.render("campgrounds/new");
});


// SHOW ROUTE - Shows more information about one campground
router.get("/:id", function(req, res) {
    // Find the campground with provided id
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err) {
            console.log(err);
        } else {
            if (!foundCampground) {
                return res.status(400).send("Item not found.")
            }
            // render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findById(req.params.id, function(err, foundCampground) {
        res.render("campgrounds/edit", {campground: foundCampground});
    });
});

// UPDATE CAMPGROUND ROUTE
// router.put("/:id",upload.single('image'), middleware.checkCampgroundOwnership, function(req, res) {
//     // find and update the correct campground
//     Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground) {
//         if(err) {
//             res.redirect("/campgrounds");
//         } else {
//             // redirect somewhere(show page)
//             res.redirect("/campgrounds/" + req.params.id);
//         }
//     });
// });

router.put("/:id", upload.single('image'), function(req, res){
    Campground.findById(req.params.id, function(err, campground){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.file) {
              try {
                  cloudinary.v2.uploader.destroy(campground.imageId);
                  var result = cloudinary.v2.uploader.upload(req.file.path);
                  campground.imageId = result.public_id;
                  campground.image = result.secure_url;
              } catch(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
            }
            campground.name = req.body.name;
            campground.description = req.body.description;
            campground.save();
            req.flash("success","Successfully Updated!");
            res.redirect("/campgrounds/" + campground._id);
        }
    });
});


// DESTROY CAMPGROUND ROUTE
// router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res) {
//     Campground.findByIdAndRemove(req.params.id, function(err) {
//         if(err) {
//             res.redirect("/campgrounds");
//         } else {
//             res.redirect("/campgrounds");
//         }
//     });
// });


router.delete('/:id',middleware.checkCampgroundOwnership, function(req, res) {
  Campground.findById(req.params.id, function(err, campground) {
    if(err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    try {
        cloudinary.v2.uploader.destroy(campground.imageId);
        campground.remove();
        req.flash('success', 'Campground deleted successfully!');
        res.redirect('/campgrounds');
    } catch(err) {
        if(err) {
          req.flash("error", err.message);
          return res.redirect("back");
        }
    }
  });
});


module.exports = router;